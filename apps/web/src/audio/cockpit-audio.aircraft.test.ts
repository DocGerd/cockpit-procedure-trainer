import {
  createSession,
  deviceControls,
  deviceCues,
  flightLegs,
  phaseOrder,
  STEP_MS,
  walkFlight,
} from '@cpt/core';
import type { Aircraft, ClickId, Session, Tone } from '@cpt/core';
import {
  createBeepPlayer,
  createClickPlayer,
  FakeAudioContext,
  MAX_LIVE_BEEPS,
  MAX_LIVE_CLICKS,
  voiceFactories,
} from '@cpt/panel-kit';
import type {
  AudioEngine,
  AudioOut,
  FakeAudioNode,
  Voice,
  VoiceFactory,
  VoiceFrame,
} from '@cpt/panel-kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { aircraftRegistry } from '../aircraft-registry';
import { deviceRegistry } from '../device-registry';
import { connectCockpitAudio } from './connect-cockpit-audio';

// The tones the driver hands the beep player, so a test tells a start-up beep from a volume tone
// without reading oscillators.
const beepPlays = vi.hoisted(
  () => [] as { tones: readonly Tone[]; whenS: number; level: number }[],
);

vi.mock('@cpt/panel-kit', async (importActual) => {
  const actual = await importActual<typeof import('@cpt/panel-kit')>();
  return {
    ...actual,
    createBeepPlayer: (...args: Parameters<typeof actual.createBeepPlayer>) => {
      const player = actual.createBeepPlayer(...args);
      return {
        play(tones: readonly Tone[], whenS: number, level: number) {
          beepPlays.push({ tones, whenS, level });
          player.play(tones, whenS, level);
        },
      };
    },
  };
});

const find = (id: string): Aircraft => {
  const aircraft = aircraftRegistry.find((candidate) => candidate.id === id);
  if (!aircraft) throw new Error(`The registry has no "${id}" aircraft`);
  return aircraft;
};
const ctsl = find('ctsl');
const demo = find('demo');
const both = [
  ['ctsl', ctsl],
  ['demo', demo],
] as const;

const flarmBeeps = deviceRegistry.find((device) => device.id === 'flarm')?.sounds?.beeps;
const START_UP = flarmBeeps?.['startup'];
const VOLUME = flarmBeeps?.['volume'];
if (!START_UP || !VOLUME) throw new Error('The FLARM declares no start-up or volume beep');

const startUps = () => beepPlays.filter(({ tones }) => tones === START_UP);
const volumeTones = () => beepPlays.filter(({ tones }) => tones === VOLUME);

// Each wait is long past the FLARM's self-test, a brief push and the beeps' own length.
const SETTLE_MS = 4000;
const BRIEF_HOLD_MS = 100;
// The ticks right after a reset, where a baseline taken a frame late would let a cue through.
const AFTER_RESET_MS = 3 * STEP_MS;
// Long past the end of any one-shot or voice fade.
const DRAIN_S = 30;

type Unit = {
  readonly powered: boolean;
  readonly lowSupply: boolean;
  readonly stage: string;
  readonly volume: string;
};
const unit = (session: Session) => session.state().devices['flarm']?.state as Unit | undefined;

const brief = (session: Session, advance: (ms: number) => void) => {
  session.press('flarm.mode');
  advance(BRIEF_HOLD_MS);
  session.release('flarm.mode');
  advance(SETTLE_MS);
};

type Heard = {
  readonly voice: string;
  readonly inputs: Readonly<Record<string, number>>;
  readonly frame: VoiceFrame;
};

/** Wraps each panel-kit voice factory, building the real voice or, with `silent`, none at all. */
function recordVoices(silent: boolean) {
  const heard: Heard[] = [];
  const stopped: string[] = [];
  const voices: Record<string, VoiceFactory> = Object.fromEntries(
    Object.entries(voiceFactories).map(([id, factory]) => [
      id,
      {
        problems: (options) => factory.problems(options),
        create(out, options): Voice {
          const real = silent ? undefined : factory.create(out, options);
          return {
            update(inputs, frame) {
              heard.push({ voice: id, inputs, frame });
              real?.update(inputs, frame);
            },
            stop() {
              stopped.push(id);
              real?.stop();
            },
          };
        },
      } satisfies VoiceFactory,
    ]),
  );
  return { voices, heard, stopped };
}

const disconnects: (() => void)[] = [];
let errors: MockInstance<Console['error']>;

beforeEach(() => {
  // Measuring a beep's nodes while the file is collected plays one through the recorder.
  beepPlays.length = 0;
  errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  try {
    for (const disconnect of disconnects.splice(0)) disconnect();
    // The driver logs an audio error and goes silent, which would pass every "none" here.
    expect(errors).not.toHaveBeenCalled();
    // The filters above go by identity: a beep the driver copied would slip past both.
    expect(beepPlays.filter(({ tones }) => tones !== START_UP && tones !== VOLUME)).toEqual([]);
  } finally {
    beepPlays.length = 0;
    errors.mockRestore();
  }
});

function liveEngine() {
  const context = new FakeAudioContext();
  const out = context.out();
  const engine: AudioEngine = {
    setEnabled: () => undefined,
    setVolume: () => undefined,
    out: () => out,
    live: () => true,
    subscribe: () => () => undefined,
    dispose: () => undefined,
  };
  return { context, engine };
}

/** A session whose driver runs on a live fake context, on a clock only `advance` moves. */
function cockpit(aircraft: Aircraft, { phase = 'parking' as string, silent = true } = {}) {
  const { context, engine } = liveEngine();
  const session = createSession(aircraft, { devices: deviceRegistry, phase });
  const recording = recordVoices(silent);
  let nowMs = 0;
  const disconnect = connectCockpitAudio(
    session,
    aircraft,
    deviceRegistry,
    engine,
    () => nowMs,
    recording.voices,
  );
  disconnects.push(disconnect);
  const advance = (ms: number) => {
    for (let elapsed = 0; elapsed < ms; elapsed += STEP_MS) {
      nowMs += STEP_MS;
      context.currentTime = nowMs / 1000;
      session.advance(STEP_MS);
    }
  };
  return { session, context, disconnect, advance, ...recording };
}

const inputsOf = (aircraft: Aircraft) =>
  Object.entries(aircraft.sounds ?? {}).map(
    ([id, { voice, inputs }]) => [id, voice, Object.keys(inputs ?? {})] as const,
  );

/** What the cockpit has played so far: every oscillator is a click or a beep when the voices are silent. */
const oneShots = (context: FakeAudioContext) => ({
  nodes: context.nodes.length,
  beeps: beepPlays.length,
});

/** Every continuous voice took a frame since `from` that jumped all of its inputs. */
function expectJumped(aircraft: Aircraft, heard: readonly Heard[], from: number, where: string) {
  for (const [id, voice, inputs] of inputsOf(aircraft)) {
    const frames = heard.slice(from).filter((entry) => entry.voice === voice);
    expect(frames.length, `${where}: ${id} took no frame`).toBeGreaterThan(0);
    expect(frames[0]?.frame.jump, `${where}: ${id}`).toEqual(inputs);
  }
}

const resets = [
  ['a leg restart', (session: Session) => session.restartLeg()],
  ['a retried item', (session: Session) => session.retryItem()],
] as const;
type ResetName = (typeof resets)[number][0];

describe('criterion 1: a reset plays no one-shot cue and every continuous voice jumps', () => {
  it('has continuous voices in the CTSL and none in the demo, whose cases check the one-shots only', () => {
    expect(inputsOf(ctsl).length).toBeGreaterThan(0);
    expect(inputsOf(demo)).toEqual([]);
  });

  it.each(both)('%s: from every phase to every phase, a phase load', (_id, aircraft) => {
    const { session, context, heard, advance } = cockpit(aircraft);
    let armed = 0;
    for (const from of phaseOrder) {
      for (const to of phaseOrder) {
        session.jumpToPhase(from);
        const where = `${from} to ${to}`;
        const before = session.state().devices;
        const played = oneShots(context);
        const frames = heard.length;
        const epoch = session.epoch();

        session.jumpToPhase(to);

        expect(session.epoch(), where).toBeGreaterThan(epoch);
        expect(oneShots(context), where).toEqual(played);
        expectJumped(aircraft, heard, frames, where);
        armed += deviceCues(aircraft, deviceRegistry, before, session.state().devices).length;
        advance(AFTER_RESET_MS);
        expect(oneShots(context), `${where}, after the load`).toEqual(played);
      }
    }
    // Some pair would play a cue if the load did not take a baseline, so the loop can fail.
    if (aircraft === ctsl) expect(armed).toBeGreaterThan(0);
  });

  const moveable = (aircraft: Aircraft, procedureId: string) => {
    const controls = { ...aircraft.controls, ...deviceControls(aircraft, deviceRegistry) };
    return (aircraft.procedures[procedureId]?.items ?? []).flatMap((item) => {
      if (item.type !== 'action') return [];
      const definition = controls[item.control];
      const plain =
        definition !== undefined &&
        definition.kind !== 'momentary' &&
        !('springBack' in definition && definition.springBack);
      return plain ? [item] : [];
    });
  };

  const legCases = resets.flatMap(([reset, run]) =>
    both.flatMap(([id, aircraft]) =>
      flightLegs(aircraft).map((leg) => [id, leg, reset, run, aircraft] as const),
    ),
  );

  const armedBy: Record<ResetName, number[]> = { 'a leg restart': [], 'a retried item': [] };
  const clickedBy: Record<(typeof both)[number][0], number> = { ctsl: 0, demo: 0 };

  it.each(legCases)('%s: %s, %s', (id, leg, reset, run, aircraft) => {
    const start = aircraft.procedures[leg]?.startPhase ?? 'parking';
    const { session, context, heard, advance } = cockpit(aircraft, { phase: start });
    session.startLeg(leg);
    const begun = session.state().devices;
    const quiet = oneShots(context);
    for (const { control, position } of moveable(aircraft, leg)) session.set(control, position);
    advance(STEP_MS);
    const moved = session.state().devices;
    const played = oneShots(context);
    clickedBy[id] += played.nodes - quiet.nodes;
    const frames = heard.length;
    const epoch = session.epoch();

    run(session);

    expect(session.epoch()).toBeGreaterThan(epoch);
    expect(oneShots(context)).toEqual(played);
    expectJumped(aircraft, heard, frames, leg);
    expect(session.state().devices).toEqual(begun);
    advance(AFTER_RESET_MS);
    expect(oneShots(context), 'after the reset').toEqual(played);
    if (aircraft === ctsl)
      armedBy[reset].push(deviceCues(aircraft, deviceRegistry, moved, begun).length);
  });

  it.each(resets)('has a CTSL leg where %s would play a cue without a baseline', (reset) => {
    expect(Math.max(0, ...armedBy[reset])).toBeGreaterThan(0);
  });

  // The moves before the resets were heard, so a reset that plays nothing is the driver's choice.
  it.each(both)('%s: clicked for the moves before the resets', (id) => {
    expect(clickedBy[id]).toBeGreaterThan(0);
  });

  // A leg whose start finds the FLARM on and past its self-test, so a brief push steps its volume.
  const steppable = () => {
    for (const leg of flightLegs(ctsl)) {
      const phase = ctsl.procedures[leg]?.startPhase ?? 'parking';
      const session = createSession(ctsl, { devices: deviceRegistry, phase });
      session.startLeg(leg);
      if (unit(session)?.stage === 'ready') return { leg, phase };
    }
    throw new Error('No CTSL leg starts with the FLARM ready');
  };

  it.each([
    ['a phase load', (session: Session) => session.jumpToPhase(session.phase())],
    ...resets,
  ] as const)('gives no FLARM tone at %s from a volume other than loud', (_reset, run) => {
    const { leg, phase } = steppable();
    const { session, context, advance } = cockpit(ctsl, { phase });
    session.startLeg(leg);
    brief(session, advance);
    expect(volumeTones()).toHaveLength(1);
    const stepped = session.state().devices;
    const played = oneShots(context);

    run(session);
    advance(SETTLE_MS);

    const cues = deviceCues(ctsl, deviceRegistry, stepped, session.state().devices);
    expect(cues.map(({ beep }) => beep)).toEqual(['volume']);
    expect(oneShots(context)).toEqual(played);
  });
});

describe('criterion 2: the CTSL FLARM beeps', () => {
  const LOW_SUPPLY_VOLTS = 4;

  const powered = (session: Session) => unit(session)?.powered;

  const powerUp = (session: Session, advance: (ms: number) => void) => {
    session.set('battery', 'in');
    session.set('avionicsMaster', 'on');
    advance(SETTLE_MS);
  };

  const withSupply = (volts: number): Aircraft => {
    const flarm = ctsl.devices?.['flarm'];
    if (!flarm) throw new Error('The CTSL installs no FLARM');
    return {
      ...ctsl,
      devices: { ...ctsl.devices, flarm: { ...flarm, inputs: { supplyVolts: () => volts } } },
    };
  };

  it.each([
    ['BAT in, then the Avionics Master on', ['battery', 'avionicsMaster']],
    ['the Avionics Master on, then BAT in', ['avionicsMaster', 'battery']],
  ] as const)('gives exactly one start-up beep for %s', (_path, order) => {
    const { session, advance } = cockpit(ctsl);
    const position = { battery: 'in', avionicsMaster: 'on' } as const;
    for (const control of order) {
      advance(STEP_MS);
      expect(beepPlays, `before ${control}`).toHaveLength(0);
      session.set(control, position[control]);
      advance(STEP_MS);
    }
    advance(SETTLE_MS);
    expect(powered(session)).toBe(true);
    expect(beepPlays).toHaveLength(1);
    expect(beepPlays[0]?.tones).toBe(START_UP);
  });

  it('gives none on a page load or a phase load, with the unit powered or not', () => {
    const loaded = cockpit(ctsl, { phase: 'cruise' });
    loaded.advance(SETTLE_MS);
    expect(powered(loaded.session)).toBe(true);
    expect(beepPlays).toHaveLength(0);

    const { session, advance } = cockpit(ctsl);
    advance(SETTLE_MS);
    for (const phase of phaseOrder) {
      session.jumpToPhase(phase);
      advance(SETTLE_MS);
    }
    expect(beepPlays).toHaveLength(0);
  });

  it('gives none with a low supply, for the power-on and for a push', () => {
    const { session, advance } = cockpit(withSupply(LOW_SUPPLY_VOLTS));
    powerUp(session, advance);
    expect(unit(session)).toMatchObject({ powered: true, lowSupply: true });
    brief(session, advance);
    expect(beepPlays).toHaveLength(0);
  });

  it('never meets a low supply in the CTSL, where the bus gives the unit its volts whenever it is powered', () => {
    const seen: (Unit | undefined)[] = [];
    let watching = false;
    const result = walkFlight(ctsl, {
      devices: deviceRegistry,
      afterChecklist: (session) => {
        seen.push(unit(session));
        if (watching) return;
        watching = true;
        session.subscribe(() => seen.push(unit(session)));
      },
    });
    expect(result).toEqual({ ok: true });
    expect(seen.some((reading) => reading?.powered)).toBe(true);
    expect(seen.filter((reading) => reading?.lowSupply)).toEqual([]);
  });

  it('gives one tone per brief push and none for the push into silent', () => {
    const { session, advance } = cockpit(ctsl);
    powerUp(session, advance);
    expect(startUps()).toHaveLength(1);

    const given: number[] = [];
    for (let push = 0; push < 4; push++) {
      const before = volumeTones().length;
      brief(session, advance);
      given.push(volumeTones().length - before);
    }
    expect(given).toEqual([1, 1, 0, 1]);
    const [medium, quiet, loud] = volumeTones().map(({ level }) => level);
    expect(medium).toBeGreaterThan(quiet ?? 0);
    expect(loud).toBe(startUps()[0]?.level);
    expect(startUps()).toHaveLength(1);
  });

  const cycles = (
    [
      ['avionicsMaster', 'off', 'on'],
      ['battery', 'pulled', 'in'],
    ] as const
  ).flatMap(([control, off, on]) =>
    (
      [
        ['medium', 1],
        ['quiet', 2],
        ['silent', 3],
      ] as const
    ).map(([volume, pushes]) => [control, volume, off, on, pushes] as const),
  );

  // The unit comes back at loud: its volume does not outlive a loss of power.
  it.each(cycles)(
    'gives one start-up beep at the loud level over %s off and on from %s',
    (control, volume, off, on, pushes) => {
      const { session, advance } = cockpit(ctsl);
      powerUp(session, advance);
      const loud = startUps()[0]?.level;
      for (let push = 0; push < pushes; push++) brief(session, advance);
      expect(unit(session)?.volume).toBe(volume);
      const given = beepPlays.length;

      session.set(control, off);
      advance(SETTLE_MS);
      expect(powered(session)).toBe(false);
      session.set(control, on);
      advance(SETTLE_MS);

      expect(beepPlays.slice(given).map(({ tones, level }) => ({ tones, level }))).toEqual([
        { tones: START_UP, level: loud },
      ]);
    },
  );
});

const CLICK_IDS = Object.keys({
  rocker: true,
  detent: true,
  notch: true,
  key: true,
  'push-pull': true,
  latch: true,
  handle: true,
  soft: true,
} satisfies Record<ClickId, true>) as ClickId[];

/** The nodes one one-shot holds from the moment it is scheduled. */
const heldBy = (play: (out: AudioOut) => void) => {
  const { context } = liveEngine();
  play(context.out());
  return context.liveNodes().length;
};

describe('criterion 8: live voices stay bounded over a full CTSL flight', () => {
  const perClick = Math.max(
    ...CLICK_IDS.map((id) => heldBy((out) => createClickPlayer(out).play(id, 0))),
  );
  const perBeep = heldBy((out) => createBeepPlayer(out).play(START_UP, 0, 1));

  it('holds the voices whole and the one-shots within their caps, and returns to the voices alone', () => {
    const allowance = MAX_LIVE_CLICKS * perClick + MAX_LIVE_BEEPS * perBeep;
    const { context, engine } = liveEngine();
    const recording = recordVoices(false);
    let nowMs = 0;
    let voiceNodes = new Set<FakeAudioNode>();
    let samples = 0;
    let fewestVoiceNodes = Infinity;
    let mostOneShotNodes = 0;
    const sample = () => {
      samples += 1;
      const live = context.liveNodes();
      const voices = live.filter((node) => voiceNodes.has(node)).length;
      fewestVoiceNodes = Math.min(fewestVoiceNodes, voices);
      mostOneShotNodes = Math.max(mostOneShotNodes, live.length - voices);
    };
    let connected = false;
    const result = walkFlight(ctsl, {
      devices: deviceRegistry,
      // The walk owns its session, so the driver joins once the first leg is done.
      afterChecklist: (session) => {
        if (connected) return;
        connected = true;
        // Time passes only as the walk advances the session: the moves between share a moment.
        const step = session.advance.bind(session);
        session.advance = (dtMs) => {
          nowMs += dtMs;
          context.currentTime = nowMs / 1000;
          step(dtMs);
        };
        disconnects.push(
          connectCockpitAudio(session, ctsl, deviceRegistry, engine, () => nowMs, recording.voices),
        );
        voiceNodes = new Set(context.liveNodes());
        // State listeners hear a change before the click plays, so the clicks need their own.
        session.subscribe(sample);
        session.onControlChange(sample);
      },
    });

    expect(result).toEqual({ ok: true });
    expect(voiceNodes.size).toBeGreaterThan(0);
    expect(samples).toBeGreaterThan(0);
    expect(fewestVoiceNodes).toBe(voiceNodes.size);
    expect(mostOneShotNodes).toBeGreaterThan(0);
    expect(mostOneShotNodes).toBeLessThanOrEqual(allowance);
    const engineHeard = recording.heard.filter(({ voice }) => voice === 'piston-engine');
    expect(engineHeard.some(({ inputs }) => inputs['running'] === 1 && inputs['rpm'] !== 0)).toBe(
      true,
    );
    expect(
      recording.heard.some(({ voice, inputs }) => voice === 'electric-motor' && inputs['driving']),
    ).toBe(true);

    context.currentTime += DRAIN_S;
    expect(new Set(context.liveNodes())).toEqual(voiceNodes);
    disconnects.at(-1)?.();
    context.currentTime += DRAIN_S;
    expect(context.liveNodes()).toEqual([]);
  });

  it('drops the clicks past the cap in a burst of moves within one tick', () => {
    const { session, context, advance } = cockpit(ctsl);
    for (let move = 0; move < 2 * MAX_LIVE_CLICKS; move++) {
      session.set('parkingBrakeValve', move % 2 === 0 ? 'closed' : 'open');
    }
    expect(context.liveNodes()).toHaveLength(MAX_LIVE_CLICKS * perClick);
    advance(SETTLE_MS);
    expect(context.liveNodes()).toEqual([]);
  });
});

describe('criterion 14: leaving the trainer screen stops every voice of the CTSL', () => {
  const voices = Object.values(ctsl.sounds ?? {})
    .map(({ voice }) => voice)
    .sort();

  // The useCockpitAudio test in connect-cockpit-audio.test.ts pins that the picker and the error
  // screen unmount the hook, which calls this disconnect.
  it('stops each voice with the engine running, feeds them no more and frees their nodes', () => {
    const { session, context, disconnect, advance, heard, stopped } = cockpit(ctsl, {
      phase: 'cruise',
      silent: false,
    });
    advance(1000);
    const engineHeard = heard.filter(({ voice }) => voice === 'piston-engine');
    expect(engineHeard.at(-1)?.inputs['running']).toBe(1);
    expect(stopped).toEqual([]);
    expect(context.liveNodes().length).toBeGreaterThan(0);

    disconnect();
    expect([...stopped].sort()).toEqual(voices);

    const fed = heard.length;
    session.set('flapSelector', '15');
    advance(1000);
    expect(heard).toHaveLength(fed);
    expect(stopped).toHaveLength(voices.length);
    context.currentTime += DRAIN_S;
    expect(context.liveNodes()).toEqual([]);
  });

  it('stops each voice once the runtime fails with the engine running, as the session-failure screen shows', () => {
    let broken = false;
    const failing: Aircraft = {
      ...ctsl,
      systems: {
        ...ctsl.systems,
        step: (state, input) => {
          if (broken) throw new Error('The systems step failed');
          return ctsl.systems.step(state, input);
        },
      },
    };
    const { session, context, advance, heard, stopped } = cockpit(failing, {
      phase: 'cruise',
      silent: false,
    });
    advance(1000);
    const engineHeard = heard.filter(({ voice }) => voice === 'piston-engine');
    expect(engineHeard.at(-1)?.inputs['running']).toBe(1);

    broken = true;
    advance(STEP_MS);
    expect(session.status().kind).toBe('failed');
    expect([...stopped].sort()).toEqual(voices);

    const fed = heard.length;
    advance(1000);
    expect(heard).toHaveLength(fed);
    context.currentTime += DRAIN_S;
    expect(context.liveNodes()).toEqual([]);
  });
});

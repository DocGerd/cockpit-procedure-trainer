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
import type { AudioEngine, AudioOut, Voice, VoiceFactory, VoiceFrame } from '@cpt/panel-kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

afterEach(() => {
  for (const disconnect of disconnects.splice(0)) disconnect();
  beepPlays.length = 0;
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

describe('criterion 1: a reset plays no one-shot cue and every continuous voice jumps', () => {
  it.each(both)('%s: from every phase to every phase, a phase load', (_id, aircraft) => {
    const { session, context, heard } = cockpit(aircraft);
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

  const legCases = both.flatMap(([id, aircraft]) =>
    flightLegs(aircraft).map((leg) => [id, leg, aircraft] as const),
  );

  const armedRestarts: number[] = [];

  it.each(legCases)('%s: %s, a leg restart', (_id, leg, aircraft) => {
    const start = aircraft.procedures[leg]?.startPhase ?? 'parking';
    const { session, context, heard, advance } = cockpit(aircraft, { phase: start });
    session.startLeg(leg);
    const begun = session.state().devices;
    for (const { control, position } of moveable(aircraft, leg)) session.set(control, position);
    advance(STEP_MS);
    const moved = session.state().devices;
    const played = oneShots(context);
    const frames = heard.length;
    const epoch = session.epoch();

    session.restartLeg();

    expect(session.epoch()).toBeGreaterThan(epoch);
    expect(oneShots(context)).toEqual(played);
    expectJumped(aircraft, heard, frames, leg);
    expect(session.state().devices).toEqual(begun);
    if (aircraft === ctsl) {
      armedRestarts.push(deviceCues(aircraft, deviceRegistry, moved, begun).length);
    }
  });

  it('has a CTSL leg whose restart would play a cue without a baseline', () => {
    expect(Math.max(0, ...armedRestarts)).toBeGreaterThan(0);
  });

  const armedRetries: number[] = [];

  it.each(legCases)('%s: %s, a retried item', (_id, leg, aircraft) => {
    const start = aircraft.procedures[leg]?.startPhase ?? 'parking';
    const { session, context, heard, advance } = cockpit(aircraft, { phase: start });
    session.startLeg(leg);
    const begun = session.state().devices;
    for (const { control, position } of moveable(aircraft, leg)) session.set(control, position);
    advance(STEP_MS);
    const moved = session.state().devices;
    const played = oneShots(context);
    const frames = heard.length;
    const epoch = session.epoch();

    session.retryItem();

    expect(session.epoch()).toBeGreaterThan(epoch);
    expect(oneShots(context)).toEqual(played);
    expectJumped(aircraft, heard, frames, leg);
    expect(session.state().devices).toEqual(begun);
    if (aircraft === ctsl) {
      armedRetries.push(deviceCues(aircraft, deviceRegistry, moved, begun).length);
    }
  });

  it('has a CTSL leg whose retried item would play a cue without a baseline', () => {
    expect(Math.max(0, ...armedRetries)).toBeGreaterThan(0);
  });
});

describe('criterion 2: the CTSL FLARM beeps', () => {
  // Each wait is long past the unit's self-test, a brief push and the beeps' own length.
  const SETTLE_MS = 4000;
  const BRIEF_HOLD_MS = 100;
  const LOW_SUPPLY_VOLTS = 4;

  type Unit = { readonly powered: boolean; readonly lowSupply: boolean };
  const unit = (session: Session) => session.state().devices['flarm']?.state as Unit | undefined;
  const powered = (session: Session) => unit(session)?.powered;

  const brief = (session: Session, advance: (ms: number) => void) => {
    session.press('flarm.mode');
    advance(BRIEF_HOLD_MS);
    session.release('flarm.mode');
    advance(SETTLE_MS);
  };

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
      expect(startUps(), `before ${control}`).toHaveLength(0);
      session.set(control, position[control]);
      advance(STEP_MS);
    }
    advance(SETTLE_MS);
    expect(powered(session)).toBe(true);
    expect(startUps()).toHaveLength(1);
    expect(volumeTones()).toHaveLength(0);
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
    const result = walkFlight(ctsl, {
      devices: deviceRegistry,
      afterChecklist: (session) => seen.push(unit(session)),
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

  it('gives one start-up beep at the loud level over a power cycle from a quieter volume', () => {
    const { session, advance } = cockpit(ctsl);
    powerUp(session, advance);
    const loud = startUps()[0]?.level;
    brief(session, advance);
    brief(session, advance);
    expect(volumeTones().at(-1)?.level).toBeLessThan(loud ?? 0);

    session.set('avionicsMaster', 'off');
    advance(SETTLE_MS);
    session.set('avionicsMaster', 'on');
    advance(SETTLE_MS);
    expect(startUps()).toHaveLength(2);
    expect(startUps()[1]?.level).toBe(loud);
  });
});

const CLICK_IDS: readonly ClickId[] = [
  'rocker',
  'detent',
  'notch',
  'key',
  'push-pull',
  'latch',
  'handle',
  'soft',
];

/** The nodes one one-shot holds from the moment it is scheduled. */
const heldBy = (play: (out: AudioOut) => void) => {
  const { context } = liveEngine();
  play(context.out());
  return context.liveNodes().length;
};

describe('criterion 8: live voices stay bounded over a full CTSL flight', () => {
  const FLIGHT_END_MARGIN_S = 30;

  it('holds at most the voices plus the one-shot caps, and returns to the voices alone', () => {
    const perClick = Math.max(
      ...CLICK_IDS.map((id) => heldBy((out) => createClickPlayer(out).play(id, 0))),
    );
    const perBeep = heldBy((out) => createBeepPlayer(out).play(START_UP, 0, 1));
    const allowance = MAX_LIVE_CLICKS * perClick + MAX_LIVE_BEEPS * perBeep;

    const { context, engine } = liveEngine();
    const recording = recordVoices(false);
    let nowMs = 0;
    let baseline = 0;
    let peak = 0;
    let connected = false;
    const result = walkFlight(ctsl, {
      devices: deviceRegistry,
      // The walk owns its session, so the driver joins once the first leg is done.
      afterChecklist: (session) => {
        if (connected) return;
        connected = true;
        disconnects.push(
          connectCockpitAudio(session, ctsl, deviceRegistry, engine, () => nowMs, recording.voices),
        );
        baseline = context.liveNodes().length;
        session.subscribe(() => {
          nowMs += STEP_MS;
          context.currentTime = nowMs / 1000;
          peak = Math.max(peak, context.liveNodes().length);
        });
      },
    });

    expect(result).toEqual({ ok: true });
    expect(baseline).toBeGreaterThan(0);
    expect(peak - baseline).toBeLessThanOrEqual(allowance);
    const engineHeard = recording.heard.filter(({ voice }) => voice === 'piston-engine');
    expect(engineHeard.some(({ inputs }) => inputs['running'] === 1 && inputs['rpm'] !== 0)).toBe(
      true,
    );
    expect(
      recording.heard.some(({ voice, inputs }) => voice === 'electric-motor' && inputs['driving']),
    ).toBe(true);

    context.currentTime += FLIGHT_END_MARGIN_S;
    expect(context.liveNodes()).toHaveLength(baseline);
    disconnects.at(-1)?.();
    context.currentTime += FLIGHT_END_MARGIN_S;
    expect(context.liveNodes()).toEqual([]);
  });
});

describe('criterion 14: leaving the trainer screen stops every voice of the CTSL', () => {
  // The picker and the error screen both unmount the screen's hook, which calls this disconnect.
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
    const voices = Object.values(ctsl.sounds ?? {}).map(({ voice }) => voice);
    expect([...stopped].sort()).toEqual([...voices].sort());

    const fed = heard.length;
    session.set('flapSelector', '15');
    advance(1000);
    expect(heard).toHaveLength(fed);
    expect(stopped).toHaveLength(voices.length);
    context.currentTime += 30;
    expect(context.liveNodes()).toEqual([]);
  });
});

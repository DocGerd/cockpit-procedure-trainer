// @vitest-environment jsdom
import { createSession, defineAircraft, defineDevice, everyPhase, STEP_MS } from '@cpt/core';
import type { Aircraft, Device, Environment, JsonObject, Session, Text } from '@cpt/core';
import { CLICK_SPACING_S, createAudioEngine, FakeAudioContext, FakeGainNode } from '@cpt/panel-kit';
import type { AudioEngine, VoiceFactory, VoiceFrame } from '@cpt/panel-kit';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement, useState } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { deviceRegistry } from '../device-registry';
import { TrainerErrorBoundary } from '../errors/TrainerErrorBoundary';
import { LanguageProvider } from '../i18n';
import { Shell } from '../shell/Shell';
import { ThemeProvider } from '../theme';
import { TrainerProvider, useTrainer } from '../trainer';
import type { Trainer } from '../trainer';
import { AudioProvider } from './AudioProvider';
import { connectCockpitAudio } from './connect-cockpit-audio';

// The screen test runs on the test aircraft; the driver tests take the CTSL from the real registry.
vi.mock('../aircraft-registry', async () => ({
  aircraftRegistry: (await import('../trainer/test-aircraft')).testAircraft,
}));

const { aircraftRegistry } =
  await vi.importActual<typeof import('../aircraft-registry')>('../aircraft-registry');
const registeredCtsl = aircraftRegistry.find((aircraft) => aircraft.id === 'ctsl');
if (!registeredCtsl) throw new Error('The registry has no CTSL');
// The click tests count every oscillator as a click, so they play the CTSL without its voices.
const ctsl: Aircraft = { ...registeredCtsl, sounds: {} };
const demo = aircraftRegistry.find((aircraft) => aircraft.id === 'demo');
if (!demo) throw new Error('The registry has no demo aircraft');
const touch = deviceRegistry.find((device) => device.id === 'aera500')?.controls['touch'];
if (touch?.kind !== 'rotary') throw new Error('The aera 500 has no touchscreen');

const contexts: FakeAudioContext[] = [];
const cleanups: (() => void)[] = [];

beforeEach(() => {
  localStorage.clear();
  contexts.length = 0;
});

afterEach(() => {
  cleanup();
  for (const done of cleanups.splice(0).reverse()) done();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const build = (): AudioContext => {
  const context = new FakeAudioContext();
  contexts.push(context);
  return context.asAudioContext();
};

const gesture = () => document.dispatchEvent(new Event('pointerdown'));

const settle = () => vi.waitFor(() => expect(contexts.at(-1)?.state).toBe('running'));

/** Each click builds one oscillator, so their start times are the clicks scheduled. */
const clickTimes = (context = contexts.at(-1)) =>
  context?.nodesOf('oscillator').map((node) => node.startedAt) ?? [];

const cockpit = (
  aircraft: Aircraft = ctsl,
): { session: Session; engine: AudioEngine; connect(): () => void } => {
  const session = createSession(aircraft, { devices: deviceRegistry });
  const engine = createAudioEngine(document, build);
  cleanups.push(() => engine.dispose());
  const connect = () => {
    const disconnect = connectCockpitAudio(session, aircraft, deviceRegistry, engine);
    cleanups.push(disconnect);
    return disconnect;
  };
  return { session, engine, connect };
};

async function liveCockpit(aircraft?: Aircraft) {
  const parts = cockpit(aircraft);
  const disconnect = parts.connect();
  gesture();
  await settle();
  return { ...parts, disconnect };
}

describe('connectCockpitAudio', () => {
  it('clicks a pilot change at the context time', async () => {
    const { session } = await liveCockpit();
    const context = contexts[0];
    if (!context) throw new Error('no context');
    context.currentTime = 2;
    expect(session.set('battery', 'in').applied).toBe(true);
    expect(clickTimes()).toEqual([2]);
  });

  it('through the real session, a device key clicks, the aera 500 touchscreen stays silent and a rotary plays a detent per position stepped, either way', async () => {
    const { session } = await liveCockpit();
    const icon = touch.positions[1];
    if (icon === undefined) throw new Error('The aera 500 touchscreen has no icon');

    session.press('gps.power');
    expect(clickTimes()).toHaveLength(1);
    session.release('gps.power');
    expect(clickTimes(), 'a key release springs back silently').toHaveLength(1);

    expect(session.press('gps.touch', icon).applied).toBe(true);
    session.release('gps.touch');
    expect(clickTimes()).toHaveLength(1);

    expect(session.set('flapSelector', '35').applied).toBe(true);
    expect(clickTimes().slice(1)).toEqual([0, CLICK_SPACING_S, 2 * CLICK_SPACING_S]);
    expect(session.set('flapSelector', '0').applied).toBe(true);
    expect(clickTimes().slice(4)).toEqual([0, CLICK_SPACING_S, 2 * CLICK_SPACING_S]);
  });

  it('plays one detent for a turn into a spring-back position and none for the spring return', async () => {
    const { session } = await liveCockpit();
    const moves = [
      ['fuelValve', 'open'],
      ['ignition', 'off'],
      ['ignition', 'both'],
    ] as const;
    for (const [id, position] of moves) {
      expect(session.set(id, position).applied, `${id} to ${position}`).toBe(true);
    }
    const before = clickTimes().length;

    expect(session.press('ignition', 'start').applied).toBe(true);
    expect(clickTimes()).toHaveLength(before + 1);
    session.release('ignition');
    expect(session.state().controls['ignition']).toBe('both');
    expect(clickTimes()).toHaveLength(before + 1);
  });

  it('clicks in the demo aircraft too: a toggle and a device key click, the continuous radio volume stays silent', async () => {
    const { session } = await liveCockpit(demo);
    expect(session.set('battery', 'on').applied).toBe(true);
    expect(session.press('radio.swap').applied).toBe(true);
    expect(session.set('radio.volume', 0.8).applied).toBe(true);
    expect(clickTimes()).toHaveLength(2);
  });

  it('plays nothing for the changes of a phase load', async () => {
    const { session } = await liveCockpit();
    session.jumpToPhase('cruise');
    expect(session.state().controls['battery']).toBe('in');
    expect(clickTimes()).toEqual([]);
  });

  it('drops the clicks while the engine is not live, rather than queueing them', async () => {
    const { session, engine, connect } = cockpit();
    connect();
    session.set('battery', 'in');
    expect(contexts).toHaveLength(0);

    gesture();
    await settle();
    engine.setEnabled(false);
    session.set('generator', 'in');
    engine.setEnabled(true);
    await settle();
    expect(clickTimes()).toEqual([]);
  });

  it('drops a click while the browser holds the context interrupted, until a gesture resumes it', async () => {
    const { session } = await liveCockpit();
    contexts[0]?.setState('interrupted');
    session.set('battery', 'in');
    expect(clickTimes()).toEqual([]);

    gesture();
    await settle();
    session.set('generator', 'in');
    expect(clickTimes()).toEqual([0]);
  });

  it('schedules the click of the gesture that creates the context on the starting context', async () => {
    const { session, connect } = cockpit();
    connect();
    const battery = document.createElement('button');
    battery.addEventListener('pointerdown', () => session.set('battery', 'in'));
    document.body.append(battery);
    cleanups.push(() => battery.remove());

    battery.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(contexts).toHaveLength(1);
    expect(contexts[0]?.state).toBe('suspended');
    expect(clickTimes()).toEqual([0]);
    await settle();
  });

  it('plays on the new context once the browser closed the old one', async () => {
    const { session } = await liveCockpit();
    contexts[0]?.setState('closed');
    gesture();
    await settle();
    session.set('battery', 'in');
    expect(contexts).toHaveLength(2);
    expect(clickTimes(contexts[0])).toEqual([]);
    expect(clickTimes(contexts[1])).toEqual([0]);
  });

  it('stops on disconnect, and a connection made again clicks once per change', async () => {
    const { session, connect } = cockpit();
    const listen = session.onControlChange.bind(session);
    const unsubscribes: (() => void)[] = [];
    vi.spyOn(session, 'onControlChange').mockImplementation((listener) => {
      const unsubscribe = vi.fn(listen(listener));
      unsubscribes.push(unsubscribe);
      return unsubscribe;
    });
    const disconnect = connect();
    gesture();
    await settle();

    disconnect();
    expect(unsubscribes[0]).toHaveBeenCalledTimes(1);
    session.set('battery', 'in');
    expect(clickTimes()).toEqual([]);
    connect();
    session.set('generator', 'in');
    expect(clickTimes()).toEqual([0]);
  });

  const fail = (message: string) => (): never => {
    throw new Error(message);
  };

  it.each([
    {
      site: 'a context node',
      breakAt: (context: FakeAudioContext) =>
        vi.spyOn(context, 'createOscillator').mockImplementation(fail('node failed')),
    },
    {
      site: 'engine.out',
      breakAt: (_context: FakeAudioContext, engine: AudioEngine) =>
        vi.spyOn(engine, 'out').mockImplementation(fail('out failed')),
    },
    {
      site: 'engine.live',
      breakAt: (_context: FakeAudioContext, engine: AudioEngine) =>
        vi.spyOn(engine, 'live').mockImplementation(fail('live failed')),
    },
  ])(
    'contains a throw from $site: logs once, naming the control, stays silent and leaves the session working',
    async ({ breakAt }) => {
      const { session, engine, connect, disconnect } = await liveCockpit();
      const context = contexts[0];
      if (!context) throw new Error('no context');
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const broken = breakAt(context, engine);

      expect(session.set('battery', 'in').applied).toBe(true);
      expect(session.set('generator', 'in').applied).toBe(true);
      expect(error).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalledWith(expect.stringContaining('battery'), expect.any(Error));

      broken.mockRestore();
      expect(() => session.advance(STEP_MS)).not.toThrow();
      expect(session.press('gps.power').applied).toBe(true);
      expect(session.state().controls['gps.power']).toBe('pressed');
      expect(clickTimes(), 'silent until the next connection').toEqual([]);
      expect(error).toHaveBeenCalledTimes(1);

      disconnect();
      connect();
      session.release('gps.power');
      session.set('battery', 'pulled');
      expect(clickTimes()).toEqual([0]);
    },
  );
});

// A test-local aircraft, device and voices, so the driver is tested apart from the real sounds.
const text = (en: string): Text => ({ de: en, en });
const ground: Environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };
const TAXI_RPM = 1200;
const CRUISE_RPM = 2400;
const START_UP_HZ = 3100;
const SET_HZ = 2700;
const SET_LEVEL = 0.5;

type BeeperState = { readonly powered: boolean; readonly rpm: number };

const beeper = defineDevice({
  id: 'beeper',
  manual: text('Beeper'),
  notModelled: [],
  controls: {},
  initial: { powered: false, rpm: 0 } as BeeperState,
  step: (_state, { powered, inputs }) => ({ powered, rpm: Number(inputs['rpm']) }),
  sounds: {
    beeps: { startUp: [{ hz: START_UP_HZ, ms: 120 }], set: [{ hz: SET_HZ, ms: 40 }] },
    cues: (previous, next) => [
      ...(!previous.powered && next.powered ? [{ beep: 'startUp' as const }] : []),
      ...(previous.powered && next.powered && previous.rpm !== next.rpm
        ? [{ beep: 'set' as const, level: SET_LEVEL }]
        : []),
    ],
  },
});

const toggle = (name: string) =>
  ({
    kind: 'toggle',
    positions: ['off', 'on'],
    initial: 'off',
    name: text(name),
    description: text(name),
  }) as const;

const entry = (master: 'off' | 'on', pump: 'off' | 'on', rpm: number) => ({
  controls: { master, pump },
  state: { rpm },
});

const sounding: Aircraft = defineAircraft({
  id: 'sounding',
  name: text('Sounding'),
  handbookRevision: text('test'),
  controls: { master: toggle('Master'), pump: toggle('Pump') },
  indicators: {},
  views: { main: { name: text('Main'), image: 'main.svg', controls: {} } },
  devices: {
    beeper: {
      device: 'beeper',
      view: 'main',
      placement: { rect: { x: 0, y: 0, w: 10, h: 10 } },
      powered: (state) => state.controls['master'] === 'on',
      inputs: { rpm: (state) => state.systems.rpm },
    },
  },
  systems: {
    initial: { rpm: 0 },
    step: (state, { failures }) => {
      if (failures.has('seize')) throw new Error('The engine seized');
      return state;
    },
    carry: (carried, phaseEntry) => ({ ...carried, rpm: phaseEntry.rpm }),
  },
  failures: { seize: { name: text('Seize') } },
  phases: {
    ...everyPhase({ image: 'ground.svg', environment: ground, entry: entry('off', 'off', 0) }),
    taxiOut: { image: 'ground.svg', environment: ground, entry: entry('off', 'off', TAXI_RPM) },
    cruise: {
      image: 'cruise.svg',
      environment: { airspeedKt: 100, altitudeFt: 3000, onGround: false },
      entry: entry('on', 'on', CRUISE_RPM),
    },
  },
  procedures: {
    toTaxi: {
      title: text('To taxi'),
      type: 'normal',
      startPhase: 'parking',
      endPhase: 'taxiOut',
      items: [
        { type: 'action', control: 'master', position: 'on', text: text('Master on') },
        { type: 'action', control: 'pump', position: 'off', text: text('Pump off') },
      ],
    },
    taxiCheck: {
      title: text('Taxi check'),
      type: 'normal',
      startPhase: 'taxiOut',
      items: [{ type: 'confirm', text: text('Taxi set') }],
    },
  },
  sounds: {
    engine: {
      voice: 'test-engine',
      options: { level: 1 },
      inputs: {
        rpm: (state) => state.systems.rpm,
        power: (state) => (state.controls['master'] === 'on' ? 1 : 0),
      },
      carried: ['rpm'],
    },
    pump: {
      voice: 'test-motor',
      inputs: { driving: (state) => (state.controls['pump'] === 'on' ? 1 : 0) },
    },
  },
});

const EVERY_INPUT = { 'test-engine': ['rpm', 'power'], 'test-motor': ['driving'] } as const;
type TestVoice = keyof typeof EVERY_INPUT;

type VoiceFault = 'create' | 'update' | 'stop';

function recordingVoices(faults: Partial<Record<TestVoice, VoiceFault>> = {}) {
  const frames: {
    readonly voice: TestVoice;
    readonly inputs: Readonly<Record<string, number>>;
    readonly frame: VoiceFrame;
  }[] = [];
  const created: { readonly voice: TestVoice; readonly options: JsonObject }[] = [];
  const stopped: TestVoice[] = [];
  const factory = (voice: TestVoice): VoiceFactory => ({
    problems: () => [],
    create(_out, options) {
      if (faults[voice] === 'create') throw new Error(`${voice} could not be built`);
      created.push({ voice, options });
      return {
        update(inputs, frame) {
          if (faults[voice] === 'update') throw new Error(`${voice} update failed`);
          frames.push({ voice, inputs, frame });
        },
        stop() {
          stopped.push(voice);
          if (faults[voice] === 'stop') throw new Error(`${voice} stop failed`);
        },
      };
    },
  });
  const voices: Record<string, VoiceFactory> = {
    'test-engine': factory('test-engine'),
    'test-motor': factory('test-motor'),
  };
  const of = (voice: TestVoice) => frames.filter((heard) => heard.voice === voice);
  const last = (voice: TestVoice) => of(voice).at(-1);
  return { voices, frames, created, stopped, of, last };
}

/** Start time and envelope peak of each beep oscillator playing a tone at `hz`. */
const beeps = (hz: number, context = contexts.at(-1)) =>
  (context?.nodesOf('oscillator') ?? [])
    .filter((node) =>
      node.frequency.calls.some((call) => call.method === 'setValueAtTime' && call.args[0] === hz),
    )
    .map((node) => {
      const envelope = node.connections[0]?.target;
      const ramp =
        envelope instanceof FakeGainNode
          ? envelope.gain.calls.find((call) => call.method === 'linearRampToValueAtTime')
          : undefined;
      const peak = ramp?.args[0];
      return { at: node.startedAt, peak: typeof peak === 'number' ? peak : undefined };
    });

const startUps = (context?: FakeAudioContext) => beeps(START_UP_HZ, context).map(({ at }) => at);

function soundCockpit({
  aircraft = sounding,
  registry = [beeper] as readonly Device[],
  recording = recordingVoices(),
} = {}) {
  const session = createSession(aircraft, { devices: registry });
  const engine = createAudioEngine(document, build);
  cleanups.push(() => engine.dispose());
  let nowMs = 0;
  const tick = () => {
    nowMs += STEP_MS;
    session.advance(STEP_MS);
  };
  const connect = () => {
    const disconnect = connectCockpitAudio(
      session,
      aircraft,
      registry,
      engine,
      () => nowMs,
      recording.voices,
    );
    cleanups.push(disconnect);
    return disconnect;
  };
  return { session, engine, recording, tick, connect };
}

/** Connected, with the context running and the voices built on it. */
async function liveSoundCockpit(options?: Parameters<typeof soundCockpit>[0]) {
  const parts = soundCockpit(options);
  const disconnect = parts.connect();
  gesture();
  await settle();
  parts.tick();
  return { ...parts, disconnect };
}

const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('connectCockpitAudio voices and device cues', () => {
  afterEach(() => {
    Reflect.deleteProperty(document, 'visibilityState');
  });

  it('builds each sound through its voice factory with its options and feeds it its inputs, timed by the clock', async () => {
    const { recording, tick } = await liveSoundCockpit();
    expect(recording.created).toEqual([
      { voice: 'test-engine', options: { level: 1 } },
      { voice: 'test-motor', options: {} },
    ]);
    tick();
    expect(recording.last('test-engine')).toEqual({
      voice: 'test-engine',
      inputs: { rpm: 0, power: 0 },
      frame: { nowMs: 2 * STEP_MS, live: true, jump: [] },
    });
    expect(recording.last('test-motor')?.inputs).toEqual({ driving: 0 });
  });

  it('plays a cue at the context time, at its level, through the beeps its device declares', async () => {
    const { session } = await liveSoundCockpit();
    const context = contexts[0];
    if (!context) throw new Error('no context');
    context.currentTime = 3;
    session.set('master', 'on');
    const [startUp] = beeps(START_UP_HZ);
    expect(startUp?.at).toBe(3);

    context.currentTime = 4;
    session.startLeg('taxiCheck');
    const [set] = beeps(SET_HZ);
    expect(set?.at).toBe(4);
    expect(set?.peak).toBeCloseTo((startUp?.peak ?? 0) * SET_LEVEL);
  });

  it('takes the baseline on connect: a cockpit already powered makes no start-up beep and every input jumps', async () => {
    const { session, recording, tick, connect } = soundCockpit();
    gesture();
    await settle();
    session.set('master', 'on');
    session.set('pump', 'on');

    connect();
    expect(recording.last('test-engine')?.frame.jump).toEqual(EVERY_INPUT['test-engine']);
    expect(recording.last('test-motor')?.frame.jump).toEqual(EVERY_INPUT['test-motor']);
    expect(recording.last('test-engine')?.inputs).toEqual({ rpm: 0, power: 1 });
    tick();
    expect(recording.last('test-engine')?.frame.jump).toEqual([]);
    expect(startUps()).toEqual([]);

    session.set('master', 'off');
    session.set('master', 'on');
    expect(startUps()).toEqual([0]);
  });

  it.each([
    { reset: 'a phase load', act: (session: Session) => session.jumpToPhase('cruise') },
    {
      reset: 'a leg restart',
      setup: (session: Session) => {
        session.set('master', 'on');
        session.startLeg('taxiCheck');
        session.set('master', 'off');
      },
      act: (session: Session) => session.restartLeg(),
    },
    {
      reset: 'a retried item',
      setup: (session: Session) => {
        session.set('pump', 'on');
        session.startLeg('toTaxi');
        session.set('master', 'on');
        session.set('master', 'off');
      },
      act: (session: Session) => session.retryItem(),
    },
  ])(
    'takes a baseline on $reset: no cue though the device powers up, every input jumps',
    async ({ setup, act }) => {
      const { session, recording } = await liveSoundCockpit();
      setup?.(session);
      const before = { startUps: startUps().length, sets: beeps(SET_HZ).length };
      const epoch = session.epoch();
      act(session);
      expect(session.epoch()).toBeGreaterThan(epoch);
      expect(session.state().devices['beeper']?.on).toBe(true);
      expect(startUps().length - before.startUps).toBe(0);
      expect(beeps(SET_HZ).length - before.sets).toBe(0);
      expect(recording.last('test-engine')?.frame.jump).toEqual(EVERY_INPUT['test-engine']);
      expect(recording.last('test-motor')?.frame.jump).toEqual(EVERY_INPUT['test-motor']);
    },
  );

  it('jumps every input once the context is created: the first gesture that powers the device schedules its start-up beep on the starting context', async () => {
    const { session, recording, connect } = soundCockpit();
    connect();
    expect(recording.created).toEqual([]);
    const master = document.createElement('button');
    master.addEventListener('pointerdown', () => session.set('master', 'on'));
    document.body.append(master);
    cleanups.push(() => master.remove());

    master.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(contexts).toHaveLength(1);
    expect(contexts[0]?.state).toBe('suspended');
    expect(startUps(contexts[0])).toEqual([0]);
    expect(recording.last('test-engine')?.frame).toMatchObject({
      live: true,
      jump: EVERY_INPUT['test-engine'],
    });
    await settle();
  });

  it('passes no jump when the starting context comes to run: only creation jumps', async () => {
    const { session, recording, tick, connect } = soundCockpit();
    connect();
    gesture();
    session.set('pump', 'on');
    expect(recording.last('test-motor')?.frame.jump).toEqual(EVERY_INPUT['test-motor']);
    await settle();
    tick();
    expect(recording.last('test-motor')?.frame).toMatchObject({ live: true, jump: [] });
  });

  it('drops a cue while not live; the voices step on without automation and the next live frame jumps every input', async () => {
    const { session, engine, recording, tick } = await liveSoundCockpit();
    engine.setEnabled(false);
    const quiet = recording.frames.length;
    tick();
    session.set('master', 'on');
    tick();
    const muted = recording.frames.slice(quiet).filter(({ voice }) => voice === 'test-engine');
    expect(muted.map(({ frame }) => frame)).toEqual([
      { nowMs: 2 * STEP_MS, live: false, jump: [] },
      { nowMs: 2 * STEP_MS, live: false, jump: [] },
      { nowMs: 3 * STEP_MS, live: false, jump: [] },
    ]);
    expect(muted.at(-1)?.inputs).toEqual({ rpm: 0, power: 1 });

    engine.setEnabled(true);
    tick();
    expect(recording.last('test-engine')?.frame).toEqual({
      nowMs: 4 * STEP_MS,
      live: true,
      jump: EVERY_INPUT['test-engine'],
    });
    await settle();
    tick();
    expect(recording.last('test-engine')?.frame.jump).toEqual([]);
    expect(startUps(), 'a cue is dropped, not queued').toEqual([]);
  });

  type Away = (engine: AudioEngine) => void | Promise<void>;
  it.each<{ jump: string; leave: Away; come: Away }>([
    {
      jump: 'sound on',
      leave: (engine) => engine.setEnabled(false),
      come: (engine) => engine.setEnabled(true),
    },
    {
      jump: 'the tab shown',
      leave: async () => {
        setVisibility('hidden');
        await vi.waitFor(() => expect(contexts[0]?.state).toBe('suspended'));
      },
      come: async () => {
        setVisibility('visible');
        await settle();
      },
    },
  ])('jumps every input on $jump and keeps the cue diff', async ({ leave, come }) => {
    const { session, engine, recording, tick } = await liveSoundCockpit();
    await leave(engine);
    tick();
    expect(recording.last('test-engine')?.frame.live).toBe(false);
    await come(engine);
    session.set('master', 'on');
    expect(recording.last('test-engine')?.frame).toMatchObject({
      live: true,
      jump: EVERY_INPUT['test-engine'],
    });
    expect(startUps()).toEqual([0]);
  });

  it('on a carried phase change through track(), jumps only the carried inputs, keeps the cue diff and lets a stopping motor play out', async () => {
    const { session, recording } = await liveSoundCockpit();
    session.set('pump', 'on');
    session.startLeg('toTaxi');
    session.set('master', 'on');
    expect(startUps()).toEqual([0]);
    const epoch = session.epoch();

    session.set('pump', 'off');
    expect(session.phase()).toBe('taxiOut');
    expect(session.epoch()).toBe(epoch);
    expect(recording.last('test-engine')).toMatchObject({
      inputs: { rpm: TAXI_RPM, power: 1 },
      frame: { jump: ['rpm'] },
    });
    expect(recording.last('test-motor')).toMatchObject({
      inputs: { driving: 0 },
      frame: { jump: [] },
    });
    expect(recording.stopped).toEqual([]);
    expect(beeps(SET_HZ).map(({ at }) => at)).toEqual([0]);
  });

  it('on a carried phase change through startLeg, jumps only the carried inputs and keeps the cue diff', async () => {
    const { session, recording } = await liveSoundCockpit();
    session.set('master', 'on');
    session.set('pump', 'on');
    const epoch = session.epoch();

    session.startLeg('taxiCheck');
    expect(session.phase()).toBe('taxiOut');
    expect(session.epoch()).toBe(epoch);
    expect(recording.last('test-engine')).toMatchObject({
      inputs: { rpm: TAXI_RPM },
      frame: { jump: ['rpm'] },
    });
    expect(recording.last('test-motor')).toMatchObject({
      inputs: { driving: 1 },
      frame: { jump: [] },
    });
    expect(beeps(SET_HZ).map(({ at }) => at)).toEqual([0]);
  });

  it('stops every voice on disconnect and feeds them no more', async () => {
    const { recording, tick, disconnect } = await liveSoundCockpit();
    disconnect();
    expect(recording.stopped).toEqual(['test-engine', 'test-motor']);
    const fed = recording.frames.length;
    tick();
    disconnect();
    expect(recording.frames).toHaveLength(fed);
    expect(recording.stopped).toHaveLength(2);
  });

  it('stops every voice once the runtime fails, and builds them again with a baseline on the next load', async () => {
    const { session, recording, tick } = await liveSoundCockpit();
    session.startSurprise({ phase: 'parking', failure: 'seize', delayMs: STEP_MS });
    tick();
    expect(session.status().kind).toBe('failed');
    expect(recording.stopped).toEqual(['test-engine', 'test-motor']);
    const fed = recording.frames.length;
    tick();
    expect(recording.frames).toHaveLength(fed);

    session.jumpToPhase('cruise');
    expect(recording.created).toHaveLength(4);
    expect(recording.last('test-engine')).toMatchObject({
      inputs: { rpm: CRUISE_RPM, power: 1 },
      frame: { jump: EVERY_INPUT['test-engine'] },
    });
  });

  it('builds the voices again on the new context once the browser closed the old one', async () => {
    const { recording, tick } = await liveSoundCockpit();
    contexts[0]?.setState('closed');
    tick();
    expect(recording.stopped).toEqual(['test-engine', 'test-motor']);
    gesture();
    await settle();
    tick();
    expect(contexts).toHaveLength(2);
    expect(recording.created).toHaveLength(4);
    expect(recording.last('test-motor')?.frame.jump).toEqual(EVERY_INPUT['test-motor']);
  });

  it.each<{ away: string; leave: (session: Session) => void; back: (session: Session) => unknown }>(
    [
      {
        away: 'the runtime fails',
        leave: (session) => {
          session.startSurprise({ phase: 'parking', failure: 'seize', delayMs: STEP_MS });
        },
        back: (session) => {
          session.jumpToPhase('cruise');
        },
      },
      {
        away: 'the browser closes the context',
        leave: () => contexts[0]?.setState('closed'),
        back: async () => {
          gesture();
          await settle();
        },
      },
    ],
  )(
    'logs a voice that throws as it stops once $away, and builds the voices again',
    async ({ leave, back }) => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { session, recording, tick } = await liveSoundCockpit({
        recording: recordingVoices({ 'test-engine': 'stop' }),
      });
      leave(session);
      tick();
      expect(recording.stopped).toEqual(['test-engine', 'test-motor']);
      expect(error).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalledWith(
        'Cockpit sound could not stop the engine sound (voice test-engine).',
        expect.objectContaining({ message: 'test-engine stop failed' }),
      );

      await back(session);
      const fed = recording.frames.length;
      tick();
      expect(recording.created).toHaveLength(4);
      expect(recording.frames.length).toBeGreaterThan(fed);
      expect(error).toHaveBeenCalledTimes(1);
    },
  );

  it('names the cockpit sound, not the last voice built, for an engine throw after the build', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { engine, recording, tick, connect } = soundCockpit();
    connect();
    gesture();
    await settle();
    expect(recording.created).toEqual([]);
    vi.spyOn(engine, 'live').mockImplementation(() => {
      throw new Error('live failed');
    });
    tick();
    expect(recording.created).toHaveLength(2);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      'Cockpit sound stopped after an audio error in the cockpit sound.',
      expect.objectContaining({ message: 'live failed' }),
    );
    expect(recording.stopped).toEqual(['test-engine', 'test-motor']);
  });

  const powersUp = (previous: unknown, next: unknown) =>
    !(previous as BeeperState).powered && (next as BeeperState).powered;

  it('plays every cue of one notification, each at its own level', async () => {
    const twoCues: Device = {
      ...beeper,
      sounds: {
        beeps: { startUp: [{ hz: START_UP_HZ, ms: 120 }], set: [{ hz: SET_HZ, ms: 40 }] },
        cues: (previous, next) =>
          powersUp(previous, next) ? [{ beep: 'startUp' }, { beep: 'set', level: SET_LEVEL }] : [],
      },
    };
    const { session } = await liveSoundCockpit({ registry: [twoCues] });
    session.set('master', 'on');
    const [startUp] = beeps(START_UP_HZ);
    const [set] = beeps(SET_HZ);
    expect([startUp?.at, set?.at]).toEqual([0, 0]);
    expect(set?.peak).toBeCloseTo((startUp?.peak ?? 0) * SET_LEVEL);
  });

  it('logs a cue naming a beep its device does not declare once, and stops every voice', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const undeclared: Device = {
      ...beeper,
      sounds: {
        beeps: { set: [{ hz: SET_HZ, ms: 40 }] },
        cues: (previous, next) => (powersUp(previous, next) ? [{ beep: 'startUp' }] : []),
      },
    };
    const { session, recording } = await liveSoundCockpit({ registry: [undeclared] });
    session.set('master', 'on');
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      'Cockpit sound stopped after an audio error at the beeper startUp beep.',
      expect.objectContaining({ message: 'No beep "startUp" on device "beeper".' }),
    );
    expect(recording.stopped).toEqual(['test-engine', 'test-motor']);
  });

  const throwingCues: Device = {
    ...beeper,
    sounds: {
      beeps: {},
      cues: () => {
        throw new Error('cues failed');
      },
    },
  };

  const breakNodes = (context: FakeAudioContext) =>
    vi.spyOn(context, 'createOscillator').mockImplementation(() => {
      throw new Error('node failed');
    });

  it.each([
    {
      site: 'a voice update',
      names: 'engine',
      options: { recording: recordingVoices({ 'test-engine': 'update' }) },
    },
    {
      site: 'a voice that cannot be built',
      names: 'pump',
      options: { recording: recordingVoices({ 'test-motor': 'create' }) },
      stops: ['test-engine'],
    },
    {
      site: 'the device cues',
      names: 'device cues',
      options: { registry: [throwingCues] },
    },
    { site: 'a beep', names: 'beeper startUp', breakAt: breakNodes },
    {
      site: 'a click',
      names: 'at pump (position off to on)',
      breakAt: breakNodes,
      move: 'pump',
      then: 'master',
    },
  ])(
    'contains a throw from $site: logs once, stops every voice and leaves the session working',
    async ({
      names,
      options,
      breakAt,
      stops = ['test-engine', 'test-motor'],
      move = 'master',
      then = 'pump',
    }) => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { session, recording, tick, connect } = soundCockpit(options);
      const disconnect = connect();
      gesture();
      await settle();
      const context = contexts[0];
      if (!context) throw new Error('no context');
      breakAt?.(context);

      tick();
      expect(session.set(move, 'on').applied).toBe(true);
      expect(error).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalledWith(expect.stringContaining(names), expect.any(Error));
      expect(recording.stopped).toEqual(stops);

      const fed = recording.frames.length;
      expect(() => tick()).not.toThrow();
      expect(session.set(then, 'on').applied).toBe(true);
      expect(session.state().controls[then]).toBe('on');
      expect(recording.frames).toHaveLength(fed);
      expect(error).toHaveBeenCalledTimes(1);
      disconnect();
      expect(recording.stopped).toEqual(stops);
    },
  );

  it('names a voice that throws as it stops in the one log that silences the sound, and still stops the others', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { recording } = await liveSoundCockpit({
      recording: recordingVoices({ 'test-engine': 'update', 'test-motor': 'stop' }),
    });
    expect(recording.stopped).toEqual(['test-engine', 'test-motor']);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      'Cockpit sound stopped after an audio error in the engine sound (voice test-engine). It could not stop the pump sound (voice test-motor).',
      expect.objectContaining({ message: 'test-engine update failed' }),
      expect.objectContaining({ message: 'test-motor stop failed' }),
    );
  });

  it('plays again on the next connection after a throw silenced the last one', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { session, recording, connect, disconnect } = await liveSoundCockpit();
    const context = contexts[0];
    if (!context) throw new Error('no context');
    const broken = breakNodes(context);
    session.set('master', 'on');
    expect(error).toHaveBeenCalledTimes(1);
    expect(recording.stopped).toEqual(['test-engine', 'test-motor']);

    broken.mockRestore();
    disconnect();
    connect();
    expect(recording.created).toHaveLength(4);
    session.set('pump', 'on');
    expect(recording.last('test-motor')?.inputs).toEqual({ driving: 1 });
    expect(clickTimes()).toHaveLength(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('logs every voice that throws as it stops on disconnect once, naming each, and still stops the others', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { recording, disconnect } = await liveSoundCockpit({
      recording: recordingVoices({ 'test-engine': 'stop', 'test-motor': 'stop' }),
    });
    disconnect();
    expect(recording.stopped).toEqual(['test-engine', 'test-motor']);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      'Cockpit sound could not stop the engine sound (voice test-engine), the pump sound (voice test-motor).',
      expect.objectContaining({ message: 'test-engine stop failed' }),
      expect.objectContaining({ message: 'test-motor stop failed' }),
    );
  });

  it.each([
    {
      voice: 'test-motor',
      unregister: (voices: Record<string, VoiceFactory>) => delete voices['test-motor'],
    },
    {
      voice: 'toString',
      aircraft: { ...sounding, sounds: { ...sounding.sounds, pump: { voice: 'toString' } } },
    },
  ])(
    'logs a voice $voice that is not in the registry once, and stays silent',
    async ({ voice, unregister, aircraft }) => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const recording = recordingVoices();
      unregister?.(recording.voices);
      const { session } = await liveSoundCockpit({ recording, ...(aircraft && { aircraft }) });
      expect(error).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalledWith(
        `Cockpit sound stopped after an audio error in the pump sound (voice ${voice}).`,
        expect.objectContaining({ message: `No voice "${voice}" is registered.` }),
      );
      expect(recording.stopped).toEqual(['test-engine']);
      session.set('master', 'on');
      expect(startUps()).toEqual([]);
    },
  );

  it('plays the panel-kit voices, timed by the performance clock, when given neither', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const motoring: Aircraft = {
      ...sounding,
      sounds: {
        flaps: {
          voice: 'electric-motor',
          inputs: { driving: (state) => (state.controls['pump'] === 'on' ? 1 : 0) },
        },
      },
    };
    const session = createSession(motoring, { devices: [beeper] });
    const engine = createAudioEngine(document, build);
    cleanups.push(() => engine.dispose());
    cleanups.push(connectCockpitAudio(session, motoring, [beeper], engine));
    gesture();
    await settle();
    const now = vi.spyOn(performance, 'now');
    session.set('pump', 'on');
    expect(now).toHaveBeenCalled();
    expect(contexts[0]?.nodesOf('oscillator').some((node) => node.periodicWave !== undefined)).toBe(
      true,
    );
    expect(error).not.toHaveBeenCalled();
  });
});

let trainer: Trainer;
function Probe() {
  trainer = useTrainer();
  return null;
}

let explode: () => void;
function Bomb() {
  const [broken, setBroken] = useState(false);
  explode = () => setBroken(true);
  if (broken) throw new Error('render failed');
  return null;
}

// The trainer screen is a lazy chunk: transform it once so Start does not wait on it.
beforeAll(async () => {
  await import('../shell/TrainerLayout');
});

describe('useCockpitAudio', () => {
  const renderApp = () =>
    render(
      createElement(
        LanguageProvider,
        null,
        createElement(
          ThemeProvider,
          null,
          createElement(
            AudioProvider,
            null,
            createElement(
              TrainerProvider,
              null,
              createElement(Probe),
              createElement(TrainerErrorBoundary, null, createElement(Bomb), createElement(Shell)),
            ),
          ),
        ),
      ),
    );

  const flip = (id: 'master' | 'pump') =>
    act(() => {
      const at = trainer.session.state().controls[id];
      trainer.session.set(id, at === 'on' ? 'off' : 'on');
    });

  const startProcedure = async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Start procedure' }));
    await screen.findByRole('region', { name: 'Cockpit panel' });
  };

  beforeEach(() => {
    vi.stubGlobal('AudioContext', function FakeBrowserContext() {
      return build();
    });
  });

  it('clicks on the trainer screen only: the picker and the error screen are silent', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderApp();
    await act(async () => gesture());
    await settle();

    flip('master');
    expect(clickTimes(), 'picker').toEqual([]);

    await startProcedure();
    flip('pump');
    expect(clickTimes(), 'trainer').toHaveLength(1);

    act(() => trainer.backToPicker());
    await screen.findByRole('button', { name: 'Start procedure' });
    flip('pump');
    expect(clickTimes(), 'picker again').toHaveLength(1);

    await startProcedure();
    flip('master');
    expect(clickTimes(), 'trainer again').toHaveLength(2);

    act(() => explode());
    screen.getByRole('alertdialog');
    flip('master');
    expect(clickTimes(), 'error screen').toHaveLength(2);
  });
});

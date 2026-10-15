import {
  STEP_MS,
  createSession,
  defineAircraft,
  everyPhase,
  formatFinding,
  validateAircraft,
} from '@cpt/core';
import type { Session, SoundCue, Text, TrainerState } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import {
  BRIEF_PUSH_MS,
  LONG_PUSH_MS,
  SELF_TEST_MS,
  SUPPLY_INPUT,
  VOLUMES,
  flarmDevice,
} from './flarm';
import type { FlarmState, FlarmVolume } from './flarm';
import { LEVELS } from './sounds';

type TestState = { readonly busOn: boolean; readonly volts: number };

const text = (de: string, en: string): Text => ({ de, en });
const environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };

const build = (volts: number, seeded: boolean) =>
  defineAircraft({
    id: 'flarm-sounds-test',
    name: text('Testflugzeug', 'Test aircraft'),
    handbookRevision: text('keine, Testaufbau', 'none, test fixture'),
    controls: {
      bus: {
        kind: 'toggle',
        positions: ['off', 'on'],
        initial: 'off',
        name: text('Bus', 'Bus'),
        description: text('Versorgt das FLARM.', 'Powers the FLARM.'),
      },
    },
    indicators: {},
    views: {
      panel: {
        name: text('Tafel', 'Panel'),
        image: 'panel.svg',
        controls: { bus: { rect: { x: 0, y: 50, w: 20, h: 20 } } },
      },
    },
    devices: {
      flarm: {
        device: 'flarm',
        view: 'panel',
        placement: { rect: { x: 0, y: 0, w: 80, h: 40 } },
        powered: (state: TrainerState<TestState>) => state.systems.busOn,
        inputs: {
          [SUPPLY_INPUT]: (state: TrainerState<TestState>) => state.systems.volts,
        },
      },
    },
    systems: {
      initial: { busOn: false, volts: 12 },
      step: (state: TestState, { controls }): TestState => ({
        ...state,
        busOn: controls.bus === 'on',
      }),
    },
    failures: {},
    phases: everyPhase({
      image: 'parking.svg',
      environment,
      entry: {
        controls: { bus: 'on' },
        state: { busOn: true, volts },
        ...(seeded
          ? { deviceStates: { flarm: { powered: true, stage: 'ready', fix: true } } }
          : {}),
      },
    }),
    procedures: {},
  });

const options = { devices: [flarmDevice] };
const flarm = (session: Session) => session.state().devices.flarm?.state as FlarmState;
const sounds = flarmDevice.sounds;
if (sounds === undefined) throw new Error('the FLARM declares no sounds');
const cuesOf = (previous: FlarmState, next: FlarmState): readonly SoundCue[] =>
  sounds.cues(previous, next);

// Every cue the device's own states give while the session runs, on every change it reports.
const watch = (session: Session) => {
  const cues: SoundCue[] = [];
  let previous = flarm(session);
  session.subscribe(() => {
    const next = flarm(session);
    cues.push(...cuesOf(previous, next));
    previous = next;
  });
  return {
    take: () => cues.splice(0),
    advance: (ms: number) => {
      for (let elapsed = 0; elapsed < ms; elapsed = elapsed + STEP_MS) session.advance(STEP_MS);
    },
  };
};

const sessionOf = (volts = 12, seeded = true) => createSession(build(volts, seeded), options);

// Power arrives after load, as it does when a pilot closes the circuit.
const powerUp = (session: Session) => {
  const run = watch(session);
  session.set('bus', 'on');
  run.advance(SELF_TEST_MS);
  return run.take();
};

const unpowered = (volts = 12) => {
  const session = sessionOf(volts, false);
  session.set('bus', 'off');
  session.advance(STEP_MS);
  return session;
};

const ready = () => {
  const session = unpowered();
  powerUp(session);
  return session;
};

const push = (session: Session, holdMs: number): SoundCue[] => {
  const run = watch(session);
  session.press('flarm.mode');
  run.advance(holdMs);
  session.release('flarm.mode');
  run.advance(STEP_MS);
  return run.take();
};

const cycle = (session: Session) => {
  session.set('bus', 'off');
  session.advance(STEP_MS);
  return powerUp(session);
};

const startup = { beep: 'startup', level: LEVELS.loud };

describe('the aircraft', () => {
  it('validates with the beep table', () => {
    expect(validateAircraft(build(12, true), options).map(formatFinding)).toEqual([]);
  });
});

describe('start-up', () => {
  it('gives one cue at loud when power arrives', () => {
    expect(powerUp(unpowered())).toEqual([startup]);
  });

  it('gives one cue at loud on every return of power, whatever the volume was', () => {
    const session = ready();
    push(session, 100);
    expect(flarm(session).volume).toBe('medium');
    expect(cycle(session)).toEqual([startup]);
    expect(flarm(session).volume).toBe('loud');
  });

  it('gives exactly the start-up after the volume was set quiet and the supply cycled', () => {
    const session = ready();
    push(session, 100);
    push(session, 100);
    expect(flarm(session).volume).toBe('quiet');
    expect(cycle(session)).toEqual([startup]);
  });

  it('gives none on a low supply', () => {
    expect(powerUp(unpowered(4))).toEqual([]);
  });

  it('gives none when the unit loads running', () => {
    const session = sessionOf();
    const run = watch(session);
    run.advance(SELF_TEST_MS);
    expect(run.take()).toEqual([]);
  });
});

describe('the volume', () => {
  it('gives one tone per brief push at the new level and none into silent', () => {
    const session = ready();
    const steps = VOLUMES.map((): [FlarmVolume, readonly SoundCue[]] => {
      const cues = push(session, 100);
      return [flarm(session).volume, cues];
    });
    expect(steps).toEqual([
      ['medium', [{ beep: 'volume', level: LEVELS.medium }]],
      ['quiet', [{ beep: 'volume', level: LEVELS.quiet }]],
      ['silent', []],
      ['loud', [{ beep: 'volume', level: LEVELS.loud }]],
    ]);
  });

  it('gives no cue for a push of about two seconds, the mode swap', () => {
    const session = ready();
    expect(2000).toBeGreaterThan(BRIEF_PUSH_MS);
    expect(2000).toBeLessThan(LONG_PUSH_MS);
    expect(push(session, 2000)).toEqual([]);
    expect(flarm(session)).toMatchObject({ mode: 'collision', volume: 'loud' });
  });

  it('gives no cue for a push of LONG_PUSH_MS or longer', () => {
    expect(push(ready(), LONG_PUSH_MS * 2)).toEqual([]);
  });

  it('gives no cue for a push during the self-test', () => {
    const session = unpowered();
    session.set('bus', 'on');
    session.advance(STEP_MS);
    expect(push(session, 100)).toEqual([]);
    expect(flarm(session).volume).toBe('loud');
  });

  it('gives none on a low supply', () => {
    const session = unpowered(4);
    session.set('bus', 'on');
    session.advance(SELF_TEST_MS);
    expect(push(session, 100)).toEqual([]);
    expect(flarm(session).volume).toBe('medium');
  });
});

describe('the levels', () => {
  const state = (patch: Partial<FlarmState>): FlarmState => ({
    ...(flarmDevice.initial as FlarmState),
    ...patch,
  });

  it('fall from loud to quiet and are nothing at silent', () => {
    expect(LEVELS.loud).toBe(1);
    expect(LEVELS.loud).toBeGreaterThan(LEVELS.medium);
    expect(LEVELS.medium).toBeGreaterThan(LEVELS.quiet);
    expect(LEVELS.quiet).toBeGreaterThan(LEVELS.silent);
    expect(LEVELS.silent).toBe(0);
  });

  it('mute a start-up that begins at silent', () => {
    expect(cuesOf(state({}), state({ powered: true, volume: 'silent' }))).toEqual([]);
  });

  it('name only beeps of the table', () => {
    const named = new Set(Object.keys(sounds.beeps));
    const cues = [
      ...cuesOf(state({}), state({ powered: true })),
      ...cuesOf(state({ powered: true }), state({ powered: true, volume: 'quiet' })),
    ];
    expect(cues).toHaveLength(2);
    for (const cue of cues) expect(named.has(cue.beep)).toBe(true);
  });
});

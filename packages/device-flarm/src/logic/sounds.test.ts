import { STEP_MS, createSession, deviceCues, formatFinding, validateAircraft } from '@cpt/core';
import type { DeviceCue, Session } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import {
  BRIEF_PUSH_MS,
  LONG_PUSH_MS,
  LOW_SUPPLY_V,
  SELF_TEST_MS,
  VOLUMES,
  flarmDevice,
} from './flarm';
import type { FlarmState, FlarmVolume } from './flarm';
import { VOLUME_LEVELS } from './sounds';
import type { FlarmBeep } from './sounds';
import { build, flarm } from './test-aircraft';

const registry = [flarmDevice];
const options = { devices: registry };
// Every variant installs the FLARM alike, so one of them serves the cue diff.
const installed = build(12, true);
const unit = (session: Session) => flarm(session.state());
const sounds = flarmDevice.sounds;
if (sounds === undefined) throw new Error('the FLARM declares no sounds');

// The driver's diff: the cues between every two states the session reports.
const watch = (session: Session) => {
  const cues: DeviceCue[] = [];
  let previous = session.state().devices;
  const stop = session.subscribe(() => {
    const next = session.state().devices;
    cues.push(...deviceCues(installed, registry, previous, next));
    previous = next;
  });
  return {
    advance: (ms: number) => {
      for (let elapsed = 0; elapsed < ms; elapsed = elapsed + STEP_MS) session.advance(STEP_MS);
    },
    take: (): readonly DeviceCue[] => {
      stop();
      return cues;
    },
  };
};

const sessionOf = (volts = 12, seeded = true) => createSession(build(volts, seeded), options);

const unpowered = (volts = 12) => {
  const session = sessionOf(volts, false);
  session.set('bus', 'off');
  session.advance(STEP_MS);
  return session;
};

// Power arrives after load, as it does when a pilot closes the circuit.
const powerUp = (session: Session) => {
  const run = watch(session);
  session.set('bus', 'on');
  run.advance(SELF_TEST_MS);
  return run.take();
};

const ready = () => {
  const session = unpowered();
  powerUp(session);
  return session;
};

const BRIEF_HOLD_MS = 100;

const push = (session: Session, holdMs: number) => {
  const run = watch(session);
  session.press('flarm.mode');
  run.advance(holdMs);
  session.release('flarm.mode');
  run.advance(STEP_MS);
  return run.take();
};

const cycle = (session: Session) => {
  const run = watch(session);
  session.set('bus', 'off');
  run.advance(STEP_MS);
  session.set('bus', 'on');
  run.advance(SELF_TEST_MS);
  return run.take();
};

const cue = (beep: FlarmBeep, volume: FlarmVolume) => ({
  beep,
  level: VOLUME_LEVELS[volume],
  install: 'flarm',
  device: 'flarm',
});
const startup = cue('startup', 'loud');
const tone = (volume: FlarmVolume) => cue('volume', volume);

describe('the aircraft', () => {
  it('validates with the beep table', () => {
    expect(validateAircraft(installed, options).map(formatFinding)).toEqual([]);
  });
});

describe('start-up', () => {
  it('gives one cue at loud when power arrives', () => {
    expect(powerUp(unpowered())).toEqual([startup]);
  });

  it.each(['medium', 'quiet', 'silent'] as const)(
    'gives exactly one cue, the start-up at loud, over a supply cycle from %s',
    (volume) => {
      const session = ready();
      for (let pushes = 0; pushes < VOLUMES.indexOf(volume); pushes = pushes + 1) {
        push(session, BRIEF_HOLD_MS);
      }
      expect(unit(session).volume).toBe(volume);
      expect(cycle(session)).toEqual([startup]);
      expect(unit(session).volume).toBe('loud');
    },
  );

  it('gives none on a low supply', () => {
    expect(powerUp(unpowered(LOW_SUPPLY_V - 1))).toEqual([]);
  });

  it('gives one when the supply reading is not a number', () => {
    expect(powerUp(unpowered(Number.NaN))).toEqual([startup]);
  });

  it('gives none when a low supply recovers with the unit on', () => {
    const session = unpowered();
    session.set('supply', 'low');
    expect(powerUp(session)).toEqual([]);
    const run = watch(session);
    session.set('supply', 'good');
    run.advance(SELF_TEST_MS);
    expect(run.take()).toEqual([]);
    expect(unit(session).lowSupply).toBe(false);
  });

  it('gives none while a running unit is left alone', () => {
    const session = sessionOf();
    const run = watch(session);
    run.advance(SELF_TEST_MS);
    expect(run.take()).toEqual([]);
  });
});

describe('the volume', () => {
  it('gives one tone per brief push at the new level and none into silent', () => {
    const session = ready();
    const steps = VOLUMES.map((): [FlarmVolume, readonly DeviceCue[]] => {
      const cues = push(session, BRIEF_HOLD_MS);
      return [unit(session).volume, cues];
    });
    expect(steps).toEqual([
      ['medium', [tone('medium')]],
      ['quiet', [tone('quiet')]],
      ['silent', []],
      ['loud', [tone('loud')]],
    ]);
  });

  it('gives no cue for a push of about two seconds, the mode swap', () => {
    const session = ready();
    expect(2000).toBeGreaterThan(BRIEF_PUSH_MS);
    expect(2000).toBeLessThan(LONG_PUSH_MS);
    expect(push(session, 2000)).toEqual([]);
    expect(unit(session)).toMatchObject({ mode: 'collision', volume: 'loud' });
  });

  it('gives no cue for a push of LONG_PUSH_MS or longer', () => {
    expect(push(ready(), LONG_PUSH_MS * 2)).toEqual([]);
  });

  it('gives no cue for a push during the self-test', () => {
    const session = unpowered();
    session.set('bus', 'on');
    session.advance(STEP_MS);
    expect(push(session, BRIEF_HOLD_MS)).toEqual([]);
    expect(unit(session).volume).toBe('loud');
  });

  it('gives none on a low supply', () => {
    const session = unpowered(LOW_SUPPLY_V - 1);
    session.set('bus', 'on');
    session.advance(SELF_TEST_MS);
    expect(push(session, BRIEF_HOLD_MS)).toEqual([]);
    expect(unit(session).volume).toBe('medium');
  });

  it('goes silent while the supply sags and comes back with it', () => {
    const session = ready();
    session.set('supply', 'low');
    session.advance(STEP_MS);
    expect(push(session, BRIEF_HOLD_MS)).toEqual([]);
    expect(unit(session).volume).toBe('medium');
    session.set('supply', 'good');
    session.advance(STEP_MS);
    expect(push(session, BRIEF_HOLD_MS)).toEqual([tone('quiet')]);
  });
});

describe('the cues on their own', () => {
  const state = (patch: Partial<FlarmState>): FlarmState => ({
    ...(flarmDevice.initial as FlarmState),
    ...patch,
  });

  it('fall in level from loud to quiet and are nothing at silent', () => {
    expect(VOLUME_LEVELS.loud).toBe(1);
    expect(VOLUME_LEVELS.loud).toBeGreaterThan(VOLUME_LEVELS.medium);
    expect(VOLUME_LEVELS.medium).toBeGreaterThan(VOLUME_LEVELS.quiet);
    expect(VOLUME_LEVELS.quiet).toBeGreaterThan(VOLUME_LEVELS.silent);
    expect(VOLUME_LEVELS.silent).toBe(0);
  });

  it('are muted at silent, also a start-up the step never gives', () => {
    expect(sounds.cues(state({}), state({ powered: true, volume: 'silent' }))).toEqual([]);
  });

  it('are muted at a volume the table does not know', () => {
    const unknown = 'loudest' as string as FlarmVolume;
    expect(sounds.cues(state({}), state({ powered: true, volume: unknown }))).toEqual([]);
    expect(
      sounds.cues(state({ powered: true }), state({ powered: true, volume: unknown })),
    ).toEqual([]);
  });

  it('name only beeps of the table', () => {
    const named = new Set(Object.keys(sounds.beeps));
    const cues = [
      ...sounds.cues(state({}), state({ powered: true })),
      ...sounds.cues(state({ powered: true }), state({ powered: true, volume: 'quiet' })),
    ];
    expect(cues).toHaveLength(2);
    for (const given of cues) expect(named.has(given.beep)).toBe(true);
  });
});

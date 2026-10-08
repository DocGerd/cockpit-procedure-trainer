import { STEP_MS } from '@cpt/core';
import type { Aircraft } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { aircraftRegistry } from '../aircraft-registry';
import type { ProcedureHistory, RunRecord } from '../storage';
import {
  pickSurprise,
  practiseNext,
  randomEmergency,
  SURPRISE_MAX_MS,
  SURPRISE_MIN_MS,
  surprisePhases,
} from './scenarios';
import { testAircraft } from './test-aircraft';

const [alpha, bravo] = testAircraft;

const required = <T>(value: T | undefined): T => {
  if (value === undefined) throw new Error('fixture is missing an entry');
  return value;
};
const fire = required(bravo.procedures['fire']);
const ctsl = required(aircraftRegistry.find((aircraft) => aircraft.id === 'ctsl'));

const withSecondFire: Aircraft = {
  ...bravo,
  phases: { cruise: required(bravo.phases['cruise']), ground: required(bravo.phases['ground']) },
  failures: { ...bravo.failures, smoke: { name: { de: 'Rauch', en: 'Smoke' } } },
  procedures: {
    ...bravo.procedures,
    fireAgain: fire,
    smoke: { ...fire, failure: 'smoke', startPhase: 'cruise' } as typeof fire,
  },
};

const run = (deviations: number, at: number): RunRecord => ({ mode: 'practice', deviations, at });
const entry = (deviations: number, at: number): ProcedureHistory => ({
  last: run(deviations, at),
  best: run(deviations, at),
});

describe('surprisePhases', () => {
  it('lists the phases with an emergency procedure in the aircraft order', () => {
    expect(surprisePhases(alpha)).toEqual([]);
    expect(surprisePhases(bravo)).toEqual(['ground']);
    expect(surprisePhases(withSecondFire)).toEqual(['cruise', 'ground']);
  });
});

describe('pickSurprise', () => {
  it('picks among the failures of the phase only, each once', () => {
    expect(pickSurprise(withSecondFire, 'ground', () => 0.99).failure).toBe('fire');
    expect(pickSurprise(withSecondFire, 'cruise', () => 0).failure).toBe('smoke');
  });

  it('keeps the delay within its bounds and on the step grid', () => {
    expect(pickSurprise(bravo, 'ground', () => 0).delayMs).toBe(SURPRISE_MIN_MS);
    expect(pickSurprise(bravo, 'ground', () => 0.999999).delayMs).toBe(SURPRISE_MAX_MS);
    const { delayMs } = pickSurprise(bravo, 'ground', () => 0.37);
    expect(delayMs).toBeGreaterThan(SURPRISE_MIN_MS);
    expect(delayMs).toBeLessThan(SURPRISE_MAX_MS);
    expect(delayMs % STEP_MS).toBe(0);
  });

  it('throws for a phase without an emergency procedure', () => {
    expect(() => pickSurprise(alpha, 'ground')).toThrow('ground');
  });
});

describe('surprise cues', () => {
  it('leaves out a failure the panel does not show, and a phase left with none', () => {
    const smokeUnseen: Aircraft = {
      ...withSecondFire,
      systems: {
        initial: { failing: false },
        step: (_state, input) => ({ failing: input.failures.has('fire') }),
      },
    };
    expect(surprisePhases(smokeUnseen)).toEqual(['ground']);
    expect(() => pickSurprise(smokeUnseen, 'cruise')).toThrow('cruise');
  });

  it('draws on the CT Supralight in cruise only failures with a cue on its panel', () => {
    const drawn = new Set(
      Array.from({ length: 60 }, (_, n) => pickSurprise(ctsl, 'cruise', () => n / 60).failure),
    );
    expect([...drawn].sort()).toEqual([
      'coolantLoss',
      'engineStoppage',
      'generatorFailure',
      'oilLoss',
    ]);
  });
});

describe('randomEmergency', () => {
  it('picks an emergency procedure, or nothing when the aircraft has none', () => {
    expect(randomEmergency(bravo, () => 0.5)).toBe('fire');
    expect(randomEmergency(withSecondFire, () => 0.99)).toBe('smoke');
    expect(randomEmergency(alpha)).toBeUndefined();
  });
});

describe('practiseNext', () => {
  it('suggests nothing without history', () => {
    expect(practiseNext(bravo, {})).toBeUndefined();
  });

  it('puts the oldest run that had deviations first', () => {
    const history = { powerUp: entry(2, 300), fire: entry(1, 200), gone: entry(5, 100) };
    expect(practiseNext(bravo, history)).toEqual({ id: 'fire', reason: 'deviations' });
  });

  it('then a procedure never run', () => {
    expect(practiseNext(bravo, { powerUp: entry(0, 300) })).toEqual({ id: 'fire', reason: 'new' });
  });

  it('then the one practised longest ago', () => {
    const history = { powerUp: entry(0, 300), fire: entry(0, 100) };
    expect(practiseNext(bravo, history)).toEqual({ id: 'fire', reason: 'oldest' });
  });

  it('ignores history of procedures the aircraft does not have', () => {
    expect(practiseNext(alpha, { fire: entry(3, 100) })).toBeUndefined();
  });
});

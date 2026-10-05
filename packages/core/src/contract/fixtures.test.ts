import { describe, expect, it } from 'vitest';
import { STARTER_MS_TO_START, fixtureAircraft } from './fixtures';
import type { FixtureState } from './fixtures';
import type { Positions } from './types';

const { systems } = fixtureAircraft;
const environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };

const parked: Positions = { master: 'on', ignition: 'off', throttle: 0, alternatorBreaker: 'in' };

function run(
  controls: Positions,
  dtMs: number,
  state: unknown = systems.initial,
  failures: ReadonlySet<string> = new Set(),
) {
  return systems.step(state, { controls, failures, environment, dtMs }) as FixtureState;
}

describe('fixture systems model', () => {
  it('starts the engine only after the starter has been held long enough', () => {
    const held = { ...parked, ignition: 'start' };
    const cranking = run(held, STARTER_MS_TO_START - 1);
    expect(cranking.engineRunning).toBe(false);
    expect(run(held, 1, cranking).engineRunning).toBe(true);
  });

  it('does not start without bus power', () => {
    const held = { ...parked, master: 'off', ignition: 'start' };
    expect(run(held, STARTER_MS_TO_START).engineRunning).toBe(false);
  });

  it('keeps running once the starter springs back, and stops with the magnetos off', () => {
    const running = run({ ...parked, ignition: 'start' }, STARTER_MS_TO_START);
    const released = run({ ...parked, ignition: 'both' }, 0, running);
    expect(released.engineRunning).toBe(true);
    expect(run(parked, 0, released).engineRunning).toBe(false);
  });

  it('charges the bus while running unless the alternator fails', () => {
    const running = run({ ...parked, ignition: 'both' }, 0, {
      ...(systems.initial as FixtureState),
      engineRunning: true,
    });
    expect(running.volts).toBeGreaterThan(12);
    const failed = run({ ...parked, ignition: 'both' }, 0, running, new Set(['alternatorFailure']));
    expect(failed.volts).toBe(12);
  });
});

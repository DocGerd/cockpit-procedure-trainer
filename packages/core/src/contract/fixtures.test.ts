import { describe, expect, it } from 'vitest';
import { defineAircraft } from './define-aircraft';
import { STARTER_MS_TO_START, fixtureAircraft } from './fixtures';
import type { FixtureState } from './fixtures';
import type { Positions, Text } from './types';

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

  it('stops charging when the alternator breaker is pulled', () => {
    const both = { ...parked, ignition: 'both' };
    const running = run(both, 0, { ...(systems.initial as FixtureState), engineRunning: true });
    expect(running.volts).toBeGreaterThan(12);
    expect(run({ ...both, alternatorBreaker: 'pulled' }, 0, running).volts).toBe(12);
  });

  it('restarts the crank time when the starter is released before the engine catches', () => {
    const held = { ...parked, ignition: 'start' };
    const cranking = run(held, STARTER_MS_TO_START - 1);
    const released = run({ ...parked, ignition: 'both' }, 0, cranking);
    expect(released.engineRunning).toBe(false);
    expect(released.starterMs).toBe(0);
    expect(run(held, STARTER_MS_TO_START - 1, released).engineRunning).toBe(false);
  });
});

describe('cockpit arrangement types', () => {
  const name: Text = { de: 'Text', en: 'Text' };
  const cell = { rect: { x: 0, y: 0, w: 1, h: 1 }, minWidth: 100 };
  const aircraft = {
    id: 'mini',
    name,
    handbookRevision: 'rev 1',
    controls: {},
    indicators: {},
    views: {
      panel: { name, image: 'panel.png' },
      console: { name, image: 'console.png' },
    },
    systems: { initial: {}, step: (state: object) => state },
    failures: {},
    phases: {},
    procedures: {},
  } as const;
  const size = { width: 2, height: 1 };

  it('accepts a cell for every view', () => {
    const defined = defineAircraft({
      ...aircraft,
      cockpit: { size, views: { panel: cell, console: cell } },
    });
    expect(Object.keys(defined.cockpit?.views ?? {})).toEqual(['panel', 'console']);
  });

  it('rejects a cell for an unknown view', () => {
    defineAircraft({
      ...aircraft,
      cockpit: {
        size,
        views: {
          panel: cell,
          console: cell,
          // @ts-expect-error nope is not a view
          nope: cell,
        },
      },
    });
  });

  it('rejects an arrangement that leaves a view without a cell', () => {
    defineAircraft({
      ...aircraft,
      // @ts-expect-error console has no cell
      cockpit: { size, views: { panel: cell } },
    });
  });
});

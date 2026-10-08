import { describe, expect, it } from 'vitest';
import { fixtureAircraft } from '../contract/fixtures';
import { engineMonitor, fixtureDeviceAircraft } from '../devices/fixtures';
import { entrySnapshot, procedureOf } from './index';

const fixturePhase = (id: string) => {
  const phase = fixtureAircraft.phases[id];
  if (!phase) throw new Error(`fixture has no phase ${id}`);
  return phase;
};

describe('entrySnapshot', () => {
  it('takes the phase controls, state and environment', () => {
    const snapshot = entrySnapshot(fixtureAircraft, [], 'holding');
    const holding = fixturePhase('holding');
    expect(snapshot.positions).toEqual(holding.entry.controls);
    expect(snapshot.systems).toBe(holding.entry.state);
    expect(snapshot.environment).toBe(holding.environment);
    expect(snapshot.devices).toEqual({});
    expect(snapshot.guards).toEqual({});
  });

  it('carries the guard positions the entry declares', () => {
    const holding = fixturePhase('holding');
    const aircraft = {
      ...fixtureAircraft,
      phases: {
        ...fixtureAircraft.phases,
        holding: { ...holding, entry: { ...holding.entry, guards: { fuelPump: 'open' as const } } },
      },
    };
    expect(entrySnapshot(aircraft, [], 'holding').guards).toEqual({ fuelPump: 'open' });
  });

  it('completes the positions with device controls and starts devices off', () => {
    const snapshot = entrySnapshot(fixtureDeviceAircraft, [engineMonitor], 'parking');
    expect(snapshot.positions['mon.page']).toBe('engine');
    expect(snapshot.positions.master).toBe('off');
    expect(snapshot.devices).toEqual({ mon: { on: false, state: engineMonitor.initial } });
  });

  it('throws naming an unknown phase', () => {
    expect(() => entrySnapshot(fixtureAircraft, [], 'nowhere')).toThrow('nowhere');
    expect(() => entrySnapshot(fixtureAircraft, [], 'toString')).toThrow('toString');
  });
});

describe('procedureOf', () => {
  it('looks a procedure up by its key', () => {
    expect(procedureOf(fixtureAircraft, 'beforeStart')).toBe(
      fixtureAircraft.procedures.beforeStart,
    );
  });

  it('throws naming an unknown id', () => {
    expect(() => procedureOf(fixtureAircraft, 'engineFire')).toThrow('engineFire');
    expect(() => procedureOf(fixtureAircraft, 'toString')).toThrow('toString');
  });
});

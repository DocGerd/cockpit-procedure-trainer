import { describe, expect, it } from 'vitest';
import { electricalBus } from './electrical-bus';
import type { ElectricalBusInputs } from './electrical-bus';

const inputs = (overrides: Partial<ElectricalBusInputs> = {}): ElectricalBusInputs => ({
  masterOn: true,
  alternatorOn: true,
  engineRunning: false,
  alternatorFailed: false,
  ...overrides,
});

const step = (overrides: Partial<ElectricalBusInputs> = {}) =>
  electricalBus.step(electricalBus.initial, inputs(overrides), 50);

describe('electricalBus', () => {
  it('starts dead', () => {
    expect(electricalBus.initial).toEqual({ busPowered: false, charging: false, volts: 0 });
  });

  it('powers the bus from the battery when the master is on', () => {
    expect(step()).toEqual({ busPowered: true, charging: false, volts: 12 });
  });

  it('leaves the bus dead with the master off', () => {
    expect(step({ masterOn: false, engineRunning: true })).toEqual({
      busPowered: false,
      charging: false,
      volts: 0,
    });
  });

  it('charges only with the engine running', () => {
    expect(step({ engineRunning: false }).charging).toBe(false);
    expect(step({ engineRunning: true })).toEqual({ busPowered: true, charging: true, volts: 14 });
  });

  it('does not charge with the alternator switched off', () => {
    expect(step({ engineRunning: true, alternatorOn: false }).charging).toBe(false);
  });

  it('does not charge when the alternator has failed', () => {
    expect(step({ engineRunning: true, alternatorFailed: true })).toEqual({
      busPowered: true,
      charging: false,
      volts: 12,
    });
  });

  it('does not mutate the previous state', () => {
    const before = { ...electricalBus.initial };
    electricalBus.step(electricalBus.initial, inputs(), 50);
    expect(electricalBus.initial).toEqual(before);
  });
});

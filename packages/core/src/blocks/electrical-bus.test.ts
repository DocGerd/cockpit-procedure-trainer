import { describe, expect, it } from 'vitest';
import { electricalBus as createElectricalBus } from './electrical-bus';
import type { ElectricalBusInputs } from './electrical-bus';

const BATTERY_VOLTS = 11;
const CHARGING_VOLTS = 13;
const electricalBus = createElectricalBus({
  batteryVolts: BATTERY_VOLTS,
  chargingVolts: CHARGING_VOLTS,
});

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
    expect(step()).toEqual({ busPowered: true, charging: false, volts: BATTERY_VOLTS });
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
    expect(step({ engineRunning: true })).toEqual({
      busPowered: true,
      charging: true,
      volts: CHARGING_VOLTS,
    });
  });

  it('does not charge with the alternator switched off', () => {
    expect(step({ engineRunning: true, alternatorOn: false }).charging).toBe(false);
  });

  it('does not charge when the alternator has failed', () => {
    expect(step({ engineRunning: true, alternatorFailed: true })).toEqual({
      busPowered: true,
      charging: false,
      volts: BATTERY_VOLTS,
    });
  });

  it('takes its voltages from the aircraft config', () => {
    const other = createElectricalBus({ batteryVolts: 24, chargingVolts: 28 });
    expect(other.step(other.initial, inputs(), 50).volts).toBe(24);
    expect(other.step(other.initial, inputs({ engineRunning: true }), 50).volts).toBe(28);
  });

  it('does not mutate its state or inputs', () => {
    const state = Object.freeze({ ...electricalBus.initial });
    const frozen = Object.freeze(inputs({ engineRunning: true }));
    expect(() => electricalBus.step(state, frozen, 50)).not.toThrow();
  });
});

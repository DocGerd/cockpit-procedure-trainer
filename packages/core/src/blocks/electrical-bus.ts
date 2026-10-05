import type { SystemBlock } from './types';

export const BATTERY_VOLTS = 12;
export const CHARGING_VOLTS = 14;

export type ElectricalBusState = {
  busPowered: boolean;
  charging: boolean;
  volts: number;
};

export type ElectricalBusInputs = {
  masterOn: boolean;
  alternatorOn: boolean;
  engineRunning: boolean;
  alternatorFailed: boolean;
};

export const electricalBus: SystemBlock<ElectricalBusState, ElectricalBusInputs> = {
  initial: { busPowered: false, charging: false, volts: 0 },
  step(_state, { masterOn, alternatorOn, engineRunning, alternatorFailed }) {
    if (!masterOn) return { busPowered: false, charging: false, volts: 0 };
    const charging = alternatorOn && engineRunning && !alternatorFailed;
    return { busPowered: true, charging, volts: charging ? CHARGING_VOLTS : BATTERY_VOLTS };
  },
};

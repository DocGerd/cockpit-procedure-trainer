import type { SystemBlock } from './types';

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

export type ElectricalBusConfig = {
  batteryVolts: number;
  chargingVolts: number;
};

export const electricalBus = ({
  batteryVolts,
  chargingVolts,
}: ElectricalBusConfig): SystemBlock<ElectricalBusState, ElectricalBusInputs> => ({
  initial: { busPowered: false, charging: false, volts: 0 },
  step(_state, { masterOn, alternatorOn, engineRunning, alternatorFailed }) {
    if (!masterOn) return { busPowered: false, charging: false, volts: 0 };
    const charging = alternatorOn && engineRunning && !alternatorFailed;
    return { busPowered: true, charging, volts: charging ? chargingVolts : batteryVolts };
  },
});

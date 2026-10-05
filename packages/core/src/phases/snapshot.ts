import type {
  Aircraft,
  Device,
  Environment,
  PhaseDefinition,
  Positions,
  ProcedureDefinition,
} from '../contract';
import { deviceEntryPositions, initialDeviceStates } from '../devices';
import type { DeviceStates } from '../devices';

export type EntrySnapshot = {
  readonly positions: Positions;
  readonly systems: unknown;
  readonly environment: Environment;
  readonly devices: DeviceStates;
};

export function entrySnapshot(
  aircraft: Aircraft,
  registry: readonly Device[],
  phaseId: string,
): EntrySnapshot {
  if (!Object.hasOwn(aircraft.phases, phaseId)) throw new Error(`Unknown phase "${phaseId}"`);
  const phase = aircraft.phases[phaseId] as PhaseDefinition<unknown>;
  return {
    positions: {
      ...phase.entry.controls,
      ...deviceEntryPositions(aircraft, registry, phaseId),
    },
    systems: phase.entry.state,
    environment: phase.environment,
    devices: initialDeviceStates(aircraft, registry),
  };
}

export function procedureOf(aircraft: Aircraft, id: string): ProcedureDefinition<unknown> {
  if (!Object.hasOwn(aircraft.procedures, id)) throw new Error(`Unknown procedure "${id}"`);
  return aircraft.procedures[id] as ProcedureDefinition<unknown>;
}

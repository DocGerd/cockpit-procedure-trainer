import { CONTRACT_VERSION } from './version';
import type { Aircraft, AircraftDefinition, ControlRecord } from './types';

export function defineAircraft<
  S,
  const CT extends ControlRecord,
  const I extends string,
  const F extends string,
  const P extends string,
  const V extends string = string,
>(definition: AircraftDefinition<S, CT, I, F, P, V>): Aircraft {
  // The type parameters only constrain the input; the stored value is the erased Aircraft.
  return { ...definition, contractVersion: CONTRACT_VERSION } as unknown as Aircraft;
}

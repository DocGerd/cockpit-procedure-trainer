import type { Text } from './types';

/** The phases of a flight in flight order; every aircraft supplies each of them. */
export const sharedPhases = [
  { id: 'parking', name: { de: 'Parkposition', en: 'Parking' } },
  { id: 'taxiOut', name: { de: 'Rollen zum Rollhalt', en: 'Taxi out' } },
  { id: 'holding', name: { de: 'Rollhalt', en: 'Holding point' } },
  { id: 'linedUp', name: { de: 'Auf der Piste ausgerichtet', en: 'Lined up on the runway' } },
  { id: 'departure', name: { de: 'Abflug', en: 'Departure' } },
  { id: 'cruise', name: { de: 'Reiseflug', en: 'Cruise' } },
  { id: 'approach', name: { de: 'Anflug', en: 'Approach' } },
  { id: 'landing', name: { de: 'Landung', en: 'Landing' } },
  { id: 'taxiIn', name: { de: 'Rollen zum Vorfeld', en: 'Taxi in' } },
  { id: 'parkingSecuring', name: { de: 'Parken und Sichern', en: 'Parking and securing' } },
] as const satisfies readonly { readonly id: string; readonly name: Text }[];

export type PhaseId = (typeof sharedPhases)[number]['id'];

export const phaseOrder: readonly PhaseId[] = sharedPhases.map(({ id }) => id);

export const isPhaseId = (id: string): id is PhaseId =>
  (phaseOrder as readonly string[]).includes(id);

export const phaseName = (id: string): Text | undefined =>
  sharedPhases.find((phase) => phase.id === id)?.name;

/** The same definition for every shared phase, for fixtures whose phases do not differ. */
export const everyPhase = <const D>(definition: D): { readonly [K in PhaseId]: D } =>
  Object.fromEntries(phaseOrder.map((id) => [id, definition])) as { readonly [K in PhaseId]: D };

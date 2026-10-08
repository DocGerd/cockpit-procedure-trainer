import { STEP_MS } from '@cpt/core';
import type { Aircraft } from '@cpt/core';
import type { ProcedureHistory } from '../storage';

export const SURPRISE_MIN_MS = 10_000;
export const SURPRISE_MAX_MS = 40_000;

type Random = () => number;

const pick = <T>(items: readonly T[], random: Random): T | undefined =>
  items[Math.min(items.length - 1, Math.floor(random() * items.length))];

const emergencies = (aircraft: Aircraft) =>
  Object.entries(aircraft.procedures).filter(([, procedure]) => procedure.type === 'emergency');

/** The phases a surprise can start in: those with an emergency procedure, in the aircraft's order. */
export function surprisePhases(aircraft: Aircraft): string[] {
  const used = new Set(emergencies(aircraft).map(([, procedure]) => procedure.startPhase));
  return Object.keys(aircraft.phases).filter((phase) => used.has(phase));
}

/** One of the phase's failures, each failure equally likely, and a delay on the step grid. */
export function pickSurprise(
  aircraft: Aircraft,
  phase: string,
  random: Random = Math.random,
): { failure: string; delayMs: number } {
  const failures = [
    ...new Set(
      emergencies(aircraft).flatMap(([, procedure]) =>
        procedure.type === 'emergency' && procedure.startPhase === phase ? [procedure.failure] : [],
      ),
    ),
  ];
  const failure = pick(failures, random);
  if (failure === undefined) throw new Error(`Phase "${phase}" has no emergency procedure`);
  const steps = Math.floor((SURPRISE_MAX_MS - SURPRISE_MIN_MS) / STEP_MS);
  const delayMs = SURPRISE_MIN_MS + Math.min(steps, Math.floor(random() * (steps + 1))) * STEP_MS;
  return { failure, delayMs };
}

export function randomEmergency(aircraft: Aircraft, random: Random = Math.random) {
  return pick(
    emergencies(aircraft).map(([id]) => id),
    random,
  );
}

export type Suggestion = { id: string; reason: 'deviations' | 'new' | 'oldest' };

/**
 * The procedure to practise next: last run with deviations first, then never run, then the one
 * practised longest ago. Nothing without any history, since there is nothing to go on.
 */
export function practiseNext(
  aircraft: Aircraft,
  history: Readonly<Record<string, ProcedureHistory>>,
): Suggestion | undefined {
  const ids = Object.keys(aircraft.procedures);
  const run = (id: string) => (Object.hasOwn(history, id) ? history[id] : undefined);
  if (!ids.some((id) => run(id) !== undefined)) return undefined;
  const oldest = (filter: (entry: ProcedureHistory) => boolean) =>
    ids
      .flatMap((id) => {
        const entry = run(id);
        return entry && filter(entry) ? [{ id, at: entry.last.at }] : [];
      })
      .sort((a, b) => a.at - b.at)[0]?.id;
  const failed = oldest((entry) => entry.last.deviations > 0);
  if (failed !== undefined) return { id: failed, reason: 'deviations' };
  const fresh = ids.find((id) => run(id) === undefined);
  if (fresh !== undefined) return { id: fresh, reason: 'new' };
  const stale = oldest(() => true);
  return stale === undefined ? undefined : { id: stale, reason: 'oldest' };
}

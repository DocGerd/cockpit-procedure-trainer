import { phaseOrder as sharedOrder } from '../contract';
import type { Aircraft } from '../contract';

/**
 * The normal procedures of a whole flight, by start phase. A procedure whose start phase the flight
 * has already passed is an alternative to one before it, and one that ends in an earlier phase
 * than it starts (a go-around) is a branch back; neither is a leg.
 */
export function flightLegs(
  aircraft: Aircraft,
  phaseOrder: readonly string[] = sharedOrder,
): readonly string[] {
  const rank = (phase: string) => phaseOrder.indexOf(phase);
  const normal = Object.entries(aircraft.procedures)
    .filter(([, procedure]) => procedure.type === 'normal' && rank(procedure.startPhase) >= 0)
    .sort(([, a], [, b]) => rank(a.startPhase) - rank(b.startPhase));
  const legs: string[] = [];
  let reached = 0;
  for (const [id, procedure] of normal) {
    const start = rank(procedure.startPhase);
    const end = procedure.endPhase === undefined ? start : rank(procedure.endPhase);
    if (start < reached || end < start) continue;
    legs.push(id);
    reached = end;
  }
  return legs;
}

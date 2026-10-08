import { createSession, STEP_MS } from '@cpt/core';
import type { Aircraft, Session } from '@cpt/core';
import { deviceRegistry } from '../device-registry';
import type { ProcedureHistory } from '../storage';
import { SURPRISE_MAX_MS, SURPRISE_MIN_MS } from './surprise-delay';

export { SURPRISE_MAX_MS, SURPRISE_MIN_MS };

type Random = () => number;

const pick = <T>(items: readonly T[], random: Random): T | undefined =>
  items[Math.min(items.length - 1, Math.floor(random() * items.length))];

const emergencies = (aircraft: Aircraft) =>
  Object.entries(aircraft.procedures).filter(([, procedure]) => procedure.type === 'emergency');

/** How soon after it appears a surprise failure must change what the pilot sees. */
const CUE_WINDOW_MS = 5_000;

const cues = new WeakMap<Aircraft, Map<string, boolean>>();

function panelReading(aircraft: Aircraft, session: Session): string {
  const state = session.state();
  return JSON.stringify([
    aircraft.engineRunning?.(state),
    Object.values(aircraft.indicators).map((indicator) => indicator.select(state)),
    Object.values(aircraft.devices ?? {}).map((install) => [
      install.powered(state),
      Object.values(install.inputs).map((read) => read(state)),
    ]),
  ]);
}

// A failure the panel cannot show (an engine fire without a fire cue, a flap failure while
// nobody moves the flaps) would leave the pilot nothing to recognise.
function showsCue(aircraft: Aircraft, phase: string, failure: string): boolean {
  const known = cues.get(aircraft) ?? new Map<string, boolean>();
  cues.set(aircraft, known);
  const key = `${phase}/${failure}`;
  const cached = known.get(key);
  if (cached !== undefined) return cached;
  const plain = createSession(aircraft, { devices: deviceRegistry, phase });
  const failing = createSession(aircraft, { devices: deviceRegistry, phase });
  failing.startSurprise({ phase, failure, delayMs: 0 });
  let cue = false;
  for (let ms = 0; ms < CUE_WINDOW_MS && !cue; ms += STEP_MS) {
    plain.advance(STEP_MS);
    failing.advance(STEP_MS);
    cue = panelReading(aircraft, plain) !== panelReading(aircraft, failing);
  }
  known.set(key, cue);
  return cue;
}

/** The failures of the phase's emergency procedures that show on the panel. */
function surpriseFailures(aircraft: Aircraft, phase: string): string[] {
  const failures = emergencies(aircraft).flatMap(([, procedure]) =>
    procedure.type === 'emergency' && procedure.startPhase === phase ? [procedure.failure] : [],
  );
  return [...new Set(failures)].filter((failure) => showsCue(aircraft, phase, failure));
}

/** The phases a surprise can start in, in the aircraft's order. */
export function surprisePhases(aircraft: Aircraft): string[] {
  return Object.keys(aircraft.phases).filter(
    (phase) => surpriseFailures(aircraft, phase).length > 0,
  );
}

/** One of the phase's surprise failures, each equally likely, and a delay on the step grid. */
export function pickSurprise(
  aircraft: Aircraft,
  phase: string,
  random: Random = Math.random,
): { failure: string; delayMs: number } {
  const failure = pick(surpriseFailures(aircraft, phase), random);
  if (failure === undefined) throw new Error(`Phase "${phase}" has no failure for a surprise`);
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

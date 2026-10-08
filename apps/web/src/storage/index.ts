export type SettingKey = 'theme' | 'language' | 'aircraft' | 'history' | 'recall';

const prefix = 'cpt.';

export function readSetting(key: SettingKey): string | undefined {
  try {
    return window.localStorage.getItem(prefix + key) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeSetting(key: SettingKey, value: string): void {
  try {
    window.localStorage.setItem(prefix + key, value);
  } catch {
    // The app works without persistence (spec §5).
  }
}

export type RunMode = 'guided' | 'practice';
export type RunRecord = { mode: RunMode; deviations: number; at: number };
// Guided highlights the next control, so only Practice runs can stand as best.
export type ProcedureHistory = { last: RunRecord; best?: RunRecord };
type ByName<T> = Record<string, T>;

const MAX_AIRCRAFT = 32;
const MAX_PROCEDURES = 128;
const MAX_NAME_LENGTH = 64;
const MAX_DATE = 8.64e15;

// Keyed by names from storage, so every map has no prototype to reach through.
const emptyMap = <T>(): ByName<T> => Object.create(null) as ByName<T>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Object keys keep insertion order, so the first entries are the least recently written.
function withLatest<T>(map: ByName<T>, name: string, value: T, limit: number): ByName<T> {
  const next = emptyMap<T>();
  const kept = Object.entries(map)
    .filter(([key]) => key !== name)
    .slice(-(limit - 1));
  for (const [key, entry] of kept) next[key] = entry;
  next[name] = value;
  return next;
}

function toRun(value: unknown): RunRecord | undefined {
  if (!isRecord(value)) return undefined;
  const { mode, deviations, at } = value;
  if (mode !== 'guided' && mode !== 'practice') return undefined;
  if (typeof deviations !== 'number' || !Number.isSafeInteger(deviations) || deviations < 0) {
    return undefined;
  }
  if (typeof at !== 'number' || !Number.isSafeInteger(at) || Math.abs(at) > MAX_DATE) {
    return undefined;
  }
  return { mode, deviations, at };
}

function readAll(): ByName<ByName<ProcedureHistory>> {
  const history = emptyMap<ByName<ProcedureHistory>>();
  const raw = readSetting('history');
  if (raw === undefined) return history;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return history;
  }
  if (!isRecord(parsed)) return history;
  for (const [aircraft, procedures] of Object.entries(parsed)) {
    if (!isRecord(procedures) || aircraft.length > MAX_NAME_LENGTH) continue;
    if (Object.keys(history).length >= MAX_AIRCRAFT) break;
    const valid = emptyMap<ProcedureHistory>();
    for (const [procedure, entry] of Object.entries(procedures)) {
      if (!isRecord(entry) || procedure.length > MAX_NAME_LENGTH) continue;
      if (Object.keys(valid).length >= MAX_PROCEDURES) break;
      const last = toRun(entry['last']);
      if (!last) continue;
      const best = toRun(entry['best']);
      valid[procedure] = best?.mode === 'practice' ? { last, best } : { last };
    }
    history[aircraft] = valid;
  }
  return history;
}

export function readHistory(aircraft: string): Readonly<Record<string, ProcedureHistory>> {
  return readAll()[aircraft] ?? emptyMap<ProcedureHistory>();
}

export function recordRun(aircraft: string, procedure: string, run: RunRecord): void {
  const all = readAll();
  const procedures = all[aircraft] ?? emptyMap<ProcedureHistory>();
  const previous = procedures[procedure];
  const kept = previous?.best;
  const best = run.mode === 'practice' && !(kept && kept.deviations <= run.deviations) ? run : kept;
  const entry: ProcedureHistory = best ? { last: run, best } : { last: run };
  const updated = withLatest(procedures, procedure, entry, MAX_PROCEDURES);
  writeSetting('history', JSON.stringify(withLatest(all, aircraft, updated, MAX_AIRCRAFT)));
}

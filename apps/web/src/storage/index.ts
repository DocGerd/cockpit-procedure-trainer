export type SettingKey = 'theme' | 'language' | 'aircraft' | 'history';

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
export type ProcedureHistory = { last: RunRecord; best: RunRecord };
type ByName<T> = Record<string, T>;

// Keyed by names from storage, so every map has no prototype to reach through.
const emptyMap = <T>(): ByName<T> => Object.create(null) as ByName<T>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function toRun(value: unknown): RunRecord | undefined {
  if (!isRecord(value)) return undefined;
  const { mode, deviations, at } = value;
  if (mode !== 'guided' && mode !== 'practice') return undefined;
  if (typeof deviations !== 'number' || !Number.isInteger(deviations) || deviations < 0) {
    return undefined;
  }
  if (typeof at !== 'number' || !Number.isFinite(at)) return undefined;
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
    if (!isRecord(procedures)) continue;
    const valid = emptyMap<ProcedureHistory>();
    for (const [procedure, entry] of Object.entries(procedures)) {
      if (!isRecord(entry)) continue;
      const last = toRun(entry['last']);
      const best = toRun(entry['best']);
      if (last && best) valid[procedure] = { last, best };
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
  procedures[procedure] = {
    last: run,
    best: previous && previous.best.deviations <= run.deviations ? previous.best : run,
  };
  all[aircraft] = procedures;
  writeSetting('history', JSON.stringify(all));
}

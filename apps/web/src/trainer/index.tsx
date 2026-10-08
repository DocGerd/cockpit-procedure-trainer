import { createSession, STEP_MS } from '@cpt/core';
import type { Aircraft, Session } from '@cpt/core';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { ReactNode } from 'react';
import { aircraftRegistry } from '../aircraft-registry';
import { deviceRegistry } from '../device-registry';
import { format, useMessages } from '../i18n';
import { readSetting, recordRun, writeSetting } from '../storage';
import { messages } from './messages';
import { pickSurprise } from './scenarios';

export type Mode = 'guided' | 'practice' | 'explore';
export type TrainerScreen = 'picker' | 'trainer';

export type Trainer = {
  aircraft: Aircraft;
  selectAircraft(id: string): void;
  session: Session;
  procedureId: string | undefined;
  lastProcedureId: string | undefined;
  /** The phase of the surprise drill in progress. */
  surprisePhase: string | undefined;
  viewedProcedureId: string | undefined;
  viewProcedure(id: string): void;
  startProcedure(id: string): void;
  /** Starts a Practice run in the phase with one of its failures injected unannounced. */
  startSurprise(phase: string): void;
  /** Runs a checklist from the cockpit as it stands; during a surprise, the pilot's answer. */
  takeChecklist(id: string): void;
  /** Starts the running procedure over, or a new surprise in the same phase during a drill. */
  restart(): void;
  jumpToPhase(phaseId: string): void;
  mode: Mode;
  /** Deviations from this index on were made in Guided, so only they get its live cues. */
  guidedFrom: number;
  setMode(mode: Mode): void;
  /** Whether Practice withholds the upcoming and current item text. */
  recall: boolean;
  setRecall(on: boolean): void;
  /** Items of this run the pilot had shown with Show me, each once. */
  assisted: readonly number[];
  showMe(): void;
  resetSession(): void;
  backToPicker(): void;
  screen: TrainerScreen;
};

type TrainerState = {
  aircraft: Aircraft;
  session: Session;
  mode: Mode;
  guidedFrom: number;
  recall: boolean;
  assisted: readonly number[];
  screen: TrainerScreen;
  lastProcedureId: string | undefined;
  viewed: string | undefined;
  /** The phase of the surprise drill in progress, which outlives the session's own record. */
  surprisePhase: string | undefined;
};

function findAircraft(id: string): Aircraft | undefined {
  return aircraftRegistry.find((aircraft) => aircraft.id === id);
}

const newSession = (aircraft: Aircraft, phase?: string) =>
  createSession(
    aircraft,
    phase === undefined ? { devices: deviceRegistry } : { devices: deviceRegistry, phase },
  );

function endProcedure(session: Session): void {
  if (session.procedureId() !== undefined || session.scenario() !== undefined) {
    session.jumpToPhase(session.phase());
  }
}

/** Starts a surprise on the session and returns the trainer state for it. */
function startSurprise(aircraft: Aircraft, session: Session, phase: string): Partial<TrainerState> {
  session.startSurprise({ phase, ...pickSurprise(aircraft, phase) });
  // The pane opens on the phase's own normal checklist, which names no failure.
  const viewed = Object.entries(aircraft.procedures).find(
    ([, procedure]) => procedure.type === 'normal' && procedure.startPhase === phase,
  )?.[0];
  return {
    mode: 'practice',
    screen: 'trainer',
    guidedFrom: 0,
    assisted: [],
    lastProcedureId: undefined,
    viewed,
    surprisePhase: phase,
  };
}

function initialState(): TrainerState {
  const stored = readSetting('aircraft');
  const aircraft = (stored === undefined ? undefined : findAircraft(stored)) ?? aircraftRegistry[0];
  if (!aircraft) throw new Error('The aircraft registry is empty');
  return {
    aircraft,
    session: newSession(aircraft),
    mode: 'guided',
    guidedFrom: 0,
    recall: readSetting('recall') === 'on',
    assisted: [],
    screen: 'picker',
    lastProcedureId: undefined,
    viewed: undefined,
    surprisePhase: undefined,
  };
}

const TrainerContext = createContext<Trainer | undefined>(undefined);

export function TrainerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);
  const current = useRef(state);
  current.current = state;

  const { session } = state;
  const procedureId = useSyncExternalStore(session.subscribe, session.procedureId);

  useEffect(() => {
    const timer = setInterval(() => session.advance(STEP_MS), STEP_MS);
    return () => clearInterval(timer);
  }, [session]);

  useEffect(() => {
    let wasDone = false;
    return session.subscribe(() => {
      const checklist = session.checklist();
      const done = checklist?.done ?? false;
      const id = session.procedureId();
      const { aircraft, mode } = current.current;
      // A wrong answer to a surprise ran against another checklist's failure: no run of its own.
      const wrongAnswer = session.scenario()?.matched === false;
      if (checklist && done && !wasDone && id !== undefined && mode !== 'explore' && !wrongAnswer) {
        recordRun(aircraft.id, id, {
          mode,
          deviations: checklist.deviations.length,
          at: Date.now(),
        });
      }
      wasDone = done;
    });
  }, [session]);

  const known = Object.keys(state.aircraft.procedures);
  const viewedProcedureId = [state.viewed, procedureId, state.lastProcedureId, known[0]].find(
    (id) => id !== undefined && known.includes(id),
  );

  const trainer = useMemo<Trainer>(() => {
    const update = (next: Partial<TrainerState>) => {
      current.current = { ...current.current, ...next };
      setState(current.current);
    };
    return {
      ...state,
      procedureId,
      viewedProcedureId,
      viewProcedure(id) {
        update({ viewed: id });
      },
      selectAircraft(id) {
        const aircraft = findAircraft(id);
        if (!aircraft) throw new Error(`Unknown aircraft "${id}"`);
        writeSetting('aircraft', id);
        update({
          aircraft,
          session: newSession(aircraft),
          guidedFrom: 0,
          assisted: [],
          lastProcedureId: undefined,
          viewed: undefined,
          surprisePhase: undefined,
        });
      },
      startProcedure(id) {
        current.current.session.startProcedure(id);
        update({
          screen: 'trainer',
          guidedFrom: 0,
          assisted: [],
          lastProcedureId: id,
          viewed: undefined,
          surprisePhase: undefined,
        });
      },
      startSurprise(phase) {
        update(startSurprise(current.current.aircraft, current.current.session, phase));
      },
      takeChecklist(id) {
        current.current.session.takeChecklist(id);
        update({ guidedFrom: 0, assisted: [], lastProcedureId: id, viewed: undefined });
      },
      restart() {
        const { aircraft, session, surprisePhase } = current.current;
        const running = session.procedureId();
        if (surprisePhase !== undefined) {
          update(startSurprise(aircraft, session, surprisePhase));
        } else if (running !== undefined) {
          session.startProcedure(running);
          update({ guidedFrom: 0, assisted: [], lastProcedureId: running, viewed: undefined });
        }
      },
      jumpToPhase(phaseId) {
        current.current.session.jumpToPhase(phaseId);
        if (current.current.surprisePhase !== undefined) update({ surprisePhase: undefined });
      },
      setMode(mode) {
        if (mode === 'explore') {
          endProcedure(current.current.session);
          update({ mode, screen: 'trainer', assisted: [], viewed: undefined });
        } else if (current.current.mode !== 'explore') {
          const guidedFrom = current.current.session.checklist()?.deviations.length ?? 0;
          update({ mode, guidedFrom });
        } else {
          const { aircraft, session, lastProcedureId, surprisePhase } = current.current;
          if (surprisePhase !== undefined) {
            update(startSurprise(aircraft, session, surprisePhase));
          } else if (lastProcedureId === undefined) {
            update({ mode, screen: 'picker', viewed: undefined });
          } else {
            session.startProcedure(lastProcedureId);
            update({ mode, guidedFrom: 0, assisted: [], screen: 'trainer', viewed: undefined });
          }
        }
      },
      setRecall(on) {
        writeSetting('recall', on ? 'on' : 'off');
        update({ recall: on });
      },
      showMe() {
        const { session: live, assisted, mode } = current.current;
        const checklist = live.checklist();
        if (mode !== 'practice' || !checklist || checklist.done) return;
        if (assisted.includes(checklist.current)) return;
        update({ assisted: [...assisted, checklist.current] });
      },
      resetSession() {
        const { aircraft, session: old, surprisePhase } = current.current;
        const running = old.procedureId();
        const fresh = newSession(aircraft, running === undefined ? old.phase() : undefined);
        if (surprisePhase !== undefined) {
          update({ ...startSurprise(aircraft, fresh, surprisePhase), session: fresh });
        } else if (running === undefined) {
          update({ session: fresh });
        } else {
          fresh.startProcedure(running);
          update({ session: fresh, guidedFrom: 0, assisted: [] });
        }
      },
      backToPicker() {
        endProcedure(current.current.session);
        update({
          screen: 'picker',
          lastProcedureId: undefined,
          viewed: undefined,
          surprisePhase: undefined,
        });
      },
    };
  }, [state, procedureId, viewedProcedureId]);

  return <TrainerContext.Provider value={trainer}>{children}</TrainerContext.Provider>;
}

export function useTrainer(): Trainer {
  const trainer = useContext(TrainerContext);
  if (!trainer) throw new Error('useTrainer needs a TrainerProvider');
  return trainer;
}

export type SessionSnapshot = Pick<
  Session,
  'state' | 'guards' | 'failures' | 'checklist' | 'phase' | 'status' | 'procedureId' | 'scenario'
>;

function take(session: Session): SessionSnapshot {
  const state = session.state();
  const guards = session.guards();
  const failures = session.failures();
  const checklist = session.checklist();
  const phase = session.phase();
  const status = session.status();
  const procedureId = session.procedureId();
  const scenario = session.scenario();
  return {
    state: () => state,
    guards: () => guards,
    failures: () => failures,
    checklist: () => checklist,
    phase: () => phase,
    status: () => status,
    procedureId: () => procedureId,
    scenario: () => scenario,
  };
}

type SnapshotStore = {
  subscribe(listener: () => void): () => void;
  getSnapshot(): SessionSnapshot;
};

const stores = new WeakMap<Session, SnapshotStore>();

function storeFor(session: Session): SnapshotStore {
  const existing = stores.get(session);
  if (existing) return existing;
  let snapshot = take(session);
  let stale = false;
  session.subscribe(() => {
    stale = true;
  });
  const store: SnapshotStore = {
    subscribe: (listener) => session.subscribe(listener),
    getSnapshot() {
      if (stale) {
        snapshot = take(session);
        stale = false;
      }
      return snapshot;
    },
  };
  stores.set(session, store);
  return store;
}

const isPlain = (value: unknown): value is object => {
  if (typeof value !== 'object' || value === null) return false;
  if (Array.isArray(value)) return true;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!isPlain(a) || !isPlain(b)) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(
    (key) =>
      Object.hasOwn(b, key) &&
      Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
}

const whole = (snapshot: SessionSnapshot) => snapshot;

type Selection<T> = {
  store: SnapshotStore;
  snapshot: SessionSnapshot;
  select: (snapshot: SessionSnapshot) => T;
  value: T;
};

export function useSessionState(): SessionSnapshot;
export function useSessionState<T>(
  selector: (snapshot: SessionSnapshot) => T,
  isEqual?: (a: T, b: T) => boolean,
): T;
export function useSessionState<T>(
  selector?: (snapshot: SessionSnapshot) => T,
  isEqual: (a: T, b: T) => boolean = shallowEqual,
): T | SessionSnapshot {
  const store = storeFor(useTrainer().session);
  const select = selector ?? whole;
  const cache = useRef<Selection<T | SessionSnapshot> | undefined>(undefined);
  const equal = isEqual as (a: T | SessionSnapshot, b: T | SessionSnapshot) => boolean;

  const getSelection = () => {
    const snapshot = store.getSnapshot();
    const last = cache.current;
    if (last && last.store === store && last.snapshot === snapshot && last.select === select) {
      return last.value;
    }
    const next = select(snapshot);
    const value = last && last.store === store && equal(last.value, next) ? last.value : next;
    cache.current = { store, snapshot, select, value };
    return value;
  };

  return useSyncExternalStore(store.subscribe, getSelection);
}

export type ProgressAtRisk = { done: number; total: number; deviations: number };

export function useProgressAtRisk(): ProgressAtRisk | undefined {
  const { procedureId, aircraft } = useTrainer();
  return useSessionState((snapshot) => {
    const checklist = snapshot.checklist();
    if (procedureId === undefined || checklist === undefined || checklist.done) return undefined;
    const done = checklist.completed.length;
    const deviations = checklist.deviations.length;
    // A flow item already in place ticks at the start, which is no work of the pilot's.
    const entry: Readonly<Record<string, unknown>> =
      aircraft.phases[checklist.procedure.startPhase]?.entry.controls ?? {};
    const preset = checklist.procedure.items.filter(
      (item, index) =>
        item.type === 'action' &&
        item.flow === true &&
        entry[item.control] === item.position &&
        checklist.completed.includes(index),
    ).length;
    if (done === preset && deviations === 0) return undefined;
    return { done, total: checklist.procedure.items.length, deviations };
  });
}

// The closing sentence of every confirm dialog that discards a run, so each says what it costs.
export function useLostProgressText(): string {
  const text = useMessages(messages);
  const risk = useProgressAtRisk();
  if (risk === undefined) return '';
  const items = format(text.lostProgress, { done: risk.done, total: risk.total });
  if (risk.deviations === 0) return `${items}.`;
  const deviations = format(
    risk.deviations === 1 ? text.lostDeviationOne : text.lostDeviationOther,
    {
      count: risk.deviations,
    },
  );
  return `${items}, ${deviations}.`;
}

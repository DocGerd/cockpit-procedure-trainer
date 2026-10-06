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
import { readSetting, writeSetting } from '../storage';

export type Mode = 'guided' | 'practice' | 'explore';
export type TrainerScreen = 'picker' | 'trainer';

export type Trainer = {
  aircraft: Aircraft;
  selectAircraft(id: string): void;
  session: Session;
  procedureId: string | undefined;
  startProcedure(id: string): void;
  jumpToPhase(phaseId: string): void;
  mode: Mode;
  setMode(mode: Mode): void;
  resetSession(): void;
  backToPicker(): void;
  screen: TrainerScreen;
};

type TrainerState = {
  aircraft: Aircraft;
  session: Session;
  mode: Mode;
  screen: TrainerScreen;
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
  if (session.procedureId() !== undefined) session.jumpToPhase(session.phase());
}

function initialState(): TrainerState {
  const stored = readSetting('aircraft');
  const aircraft = (stored === undefined ? undefined : findAircraft(stored)) ?? aircraftRegistry[0];
  if (!aircraft) throw new Error('The aircraft registry is empty');
  return { aircraft, session: newSession(aircraft), mode: 'guided', screen: 'picker' };
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

  const trainer = useMemo<Trainer>(() => {
    const update = (next: Partial<TrainerState>) => {
      current.current = { ...current.current, ...next };
      setState(current.current);
    };
    return {
      ...state,
      procedureId,
      selectAircraft(id) {
        const aircraft = findAircraft(id);
        if (!aircraft) throw new Error(`Unknown aircraft "${id}"`);
        writeSetting('aircraft', id);
        update({ aircraft, session: newSession(aircraft) });
      },
      startProcedure(id) {
        current.current.session.startProcedure(id);
        update({ screen: 'trainer' });
      },
      jumpToPhase(phaseId) {
        current.current.session.jumpToPhase(phaseId);
      },
      setMode(mode) {
        if (mode === 'explore') {
          endProcedure(current.current.session);
          update({ mode, screen: 'trainer' });
        } else {
          update({ mode });
        }
      },
      resetSession() {
        const { aircraft, session: old } = current.current;
        const running = old.procedureId();
        if (running === undefined) {
          update({ session: newSession(aircraft, old.phase()) });
        } else {
          const fresh = newSession(aircraft);
          fresh.startProcedure(running);
          update({ session: fresh });
        }
      },
      backToPicker() {
        endProcedure(current.current.session);
        update({ screen: 'picker' });
      },
    };
  }, [state, procedureId]);

  return <TrainerContext.Provider value={trainer}>{children}</TrainerContext.Provider>;
}

export function useTrainer(): Trainer {
  const trainer = useContext(TrainerContext);
  if (!trainer) throw new Error('useTrainer needs a TrainerProvider');
  return trainer;
}

export type SessionSnapshot = Pick<
  Session,
  'state' | 'guards' | 'failures' | 'checklist' | 'phase' | 'status' | 'procedureId'
>;

function take(session: Session): SessionSnapshot {
  const state = session.state();
  const guards = session.guards();
  const failures = session.failures();
  const checklist = session.checklist();
  const phase = session.phase();
  const status = session.status();
  const procedureId = session.procedureId();
  return {
    state: () => state,
    guards: () => guards,
    failures: () => failures,
    checklist: () => checklist,
    phase: () => phase,
    status: () => status,
    procedureId: () => procedureId,
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

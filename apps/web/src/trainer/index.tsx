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
  mode: Mode;
  setMode(mode: Mode): void;
  resetSession(): void;
  backToPicker(): void;
  screen: TrainerScreen;
  explore(): void;
};

type TrainerState = {
  aircraft: Aircraft;
  session: Session;
  procedureId: string | undefined;
  mode: Mode;
  screen: TrainerScreen;
};

function findAircraft(id: string): Aircraft | undefined {
  return aircraftRegistry.find((aircraft) => aircraft.id === id);
}

function initialState(): TrainerState {
  const stored = readSetting('aircraft');
  const aircraft = (stored === undefined ? undefined : findAircraft(stored)) ?? aircraftRegistry[0];
  if (!aircraft) throw new Error('The aircraft registry is empty');
  return {
    aircraft,
    session: createSession(aircraft, { devices: deviceRegistry }),
    procedureId: undefined,
    mode: 'guided',
    screen: 'picker',
  };
}

const TrainerContext = createContext<Trainer | undefined>(undefined);

export function TrainerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);
  const current = useRef(state);
  current.current = state;

  const { session } = state;
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
      selectAircraft(id) {
        const aircraft = findAircraft(id);
        if (!aircraft) throw new Error(`Unknown aircraft "${id}"`);
        writeSetting('aircraft', id);
        update({
          aircraft,
          session: createSession(aircraft, { devices: deviceRegistry }),
          procedureId: undefined,
        });
      },
      startProcedure(id) {
        current.current.session.startProcedure(id);
        update({ procedureId: id, screen: 'trainer' });
      },
      setMode(mode) {
        update({ mode });
      },
      resetSession() {
        const { aircraft, procedureId } = current.current;
        const fresh = createSession(aircraft, { devices: deviceRegistry });
        if (procedureId !== undefined) fresh.startProcedure(procedureId);
        update({ session: fresh });
      },
      backToPicker() {
        update({ procedureId: undefined, screen: 'picker' });
      },
      explore() {
        const { session: active } = current.current;
        if (active.procedureId() !== undefined) active.jumpToPhase(active.phase());
        update({ mode: 'explore', procedureId: undefined, screen: 'trainer' });
      },
    };
  }, [state]);

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

export function useSessionState(): SessionSnapshot {
  const store = storeFor(useTrainer().session);
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

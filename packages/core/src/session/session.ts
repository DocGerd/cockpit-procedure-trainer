import { checkOff, observeControl, observeState, startChecklist } from '../checklist';
import type { ChecklistState } from '../checklist';
import type {
  Aircraft,
  ControlChange,
  Device,
  Environment,
  GuardPosition,
  TrainerState,
} from '../contract';
import { createControlStore } from '../controls';
import type { ControlResult } from '../controls';
import { deviceControls, stepDevices } from '../devices';
import type { DeviceStates } from '../devices';
import { createFailureSet } from '../failures';
import { entrySnapshot, procedureOf } from '../phases';
import { createSystemsRuntime } from '../runtime';
import type { RuntimeStatus } from '../runtime';

export type SessionOptions = {
  readonly devices?: readonly Device[];
  readonly phase?: string;
};

export type Session = {
  phase(): string;
  environment(): Environment;
  state(): TrainerState<unknown>;
  guards(): Readonly<Record<string, GuardPosition>>;
  failures(): ReadonlySet<string>;
  status(): RuntimeStatus;
  procedureId(): string | undefined;
  checklist(): ChecklistState<unknown> | undefined;
  set(id: string, position: string | number): ControlResult;
  press(id: string, position?: string | number): ControlResult;
  release(id: string): ControlResult;
  openGuard(id: string): ControlResult;
  closeGuard(id: string): ControlResult;
  jumpToPhase(id: string): void;
  startProcedure(id: string): void;
  advance(dtMs: number): void;
  checkOff(): void;
  subscribe(listener: () => void): () => void;
};

export function createSession(aircraft: Aircraft, options: SessionOptions = {}): Session {
  const registry = options.devices ?? [];
  const firstPhase = Object.keys(aircraft.phases)[0];
  const initialPhase = options.phase ?? firstPhase;
  if (initialPhase === undefined) throw new Error(`Aircraft "${aircraft.id}" has no phases`);
  const initial = entrySnapshot(aircraft, registry, initialPhase);

  const store = createControlStore({ ...aircraft.controls, ...deviceControls(aircraft, registry) });
  const runtime = createSystemsRuntime(aircraft.systems, {
    environment: initial.environment,
    controls: store.positions(),
  });
  const failureSet = createFailureSet(aircraft, { store, runtime });

  let phase = initialPhase;
  let environment = initial.environment;
  let devices: DeviceStates = initial.devices;
  let procedureId: string | undefined;
  let checklist: ChecklistState<unknown> | undefined;
  let loading = false;
  let depth = 0;
  const listeners = new Set<() => void>();

  const trainerState = (): TrainerState<unknown> => ({
    controls: store.positions(),
    systems: runtime.state(),
    devices,
  });

  function notify(): void {
    if (depth > 0) return;
    const errors: unknown[] = [];
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) throw errors[0];
  }

  function batch(change: () => void): void {
    depth++;
    try {
      change();
    } finally {
      depth--;
      notify();
    }
  }

  function enterPhase(id: string): void {
    const snapshot = entrySnapshot(aircraft, registry, id);
    phase = id;
    environment = snapshot.environment;
    runtime.setEnvironment(environment);
  }

  function track(next: ChecklistState<unknown>): void {
    const wasDone = checklist?.done ?? false;
    checklist = next;
    const endPhase = next.procedure.endPhase;
    if (next.done && !wasDone && endPhase !== undefined) enterPhase(endPhase);
  }

  function loadSnapshot(id: string): void {
    const snapshot = entrySnapshot(aircraft, registry, id);
    loading = true;
    try {
      store.load(snapshot.positions);
    } finally {
      loading = false;
    }
    failureSet.clearAll();
    runtime.setEnvironment(snapshot.environment);
    runtime.onControlsChanged(store.positions());
    runtime.reset(snapshot.systems);
    devices = stepDevices(aircraft, registry, { ...trainerState(), devices: snapshot.devices }, 0);
    phase = id;
    environment = snapshot.environment;
    procedureId = undefined;
    checklist = undefined;
  }

  store.subscribe((change: ControlChange) => {
    if (loading) return;
    runtime.onControlsChanged(store.positions());
    devices = stepDevices(aircraft, registry, trainerState(), 0);
    if (checklist) track(observeControl(checklist, change, trainerState()));
    notify();
  });

  loadSnapshot(initialPhase);

  return {
    phase: () => phase,
    environment: () => environment,
    state: trainerState,
    guards: store.guards,
    failures: () => failureSet.active(),
    status: runtime.status,
    procedureId: () => procedureId,
    checklist: () => checklist,

    set: store.set,
    press: store.press,
    release: store.release,
    openGuard: store.openGuard,
    closeGuard: store.closeGuard,

    jumpToPhase: (id) => batch(() => loadSnapshot(id)),

    startProcedure(id) {
      const procedure = procedureOf(aircraft, id);
      batch(() => {
        loadSnapshot(procedure.startPhase);
        if (procedure.type === 'emergency') failureSet.inject(procedure.failure);
        procedureId = id;
        track(startChecklist(procedure, trainerState()));
      });
    },

    advance(dtMs) {
      runtime.advance(dtMs);
      devices = stepDevices(aircraft, registry, trainerState(), dtMs);
      if (checklist) track(observeState(checklist, trainerState()));
      notify();
    },

    checkOff() {
      if (!checklist) return;
      track(checkOff(checklist, trainerState()));
      notify();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

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

export type SessionControlResult =
  ControlResult | { readonly applied: false; readonly reason: 'failed' };

export type Session = {
  phase(): string;
  environment(): Environment;
  state(): TrainerState<unknown>;
  guards(): Readonly<Record<string, GuardPosition>>;
  failures(): ReadonlySet<string>;
  status(): RuntimeStatus;
  procedureId(): string | undefined;
  checklist(): ChecklistState<unknown> | undefined;
  set(id: string, position: string | number): SessionControlResult;
  press(id: string, position?: string | number): SessionControlResult;
  release(id: string): SessionControlResult;
  openGuard(id: string): SessionControlResult;
  closeGuard(id: string): SessionControlResult;
  jumpToPhase(id: string): void;
  startProcedure(id: string): void;
  advance(dtMs: number): void;
  checkOff(): void;
  subscribe(listener: () => void): () => void;
};

const FAILED: SessionControlResult = { applied: false, reason: 'failed' };

export function createSession(aircraft: Aircraft, options: SessionOptions = {}): Session {
  const registry = options.devices ?? [];
  const initialPhase = options.phase ?? Object.keys(aircraft.phases)[0];
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
  let deviceFailure: RuntimeStatus | undefined;
  let depth = 0;
  const listeners = new Set<() => void>();

  const status = (): RuntimeStatus => deviceFailure ?? runtime.status();
  const failed = () => status().kind === 'failed';

  const buildState = (): TrainerState<unknown> => ({
    controls: store.positions(),
    systems: runtime.state(),
    devices,
  });

  let dirty = true;
  let cachedState: TrainerState<unknown>;
  let cachedGuards: Readonly<Record<string, GuardPosition>>;
  let cachedFailures: ReadonlySet<string>;
  function refresh(): void {
    if (!dirty) return;
    cachedState = buildState();
    cachedGuards = store.guards();
    cachedFailures = failureSet.active();
    dirty = false;
  }

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
    dirty = true;
    try {
      change();
    } catch (error) {
      depth--;
      throw error;
    } finally {
      dirty = true;
    }
    depth--;
    notify();
  }

  function settleDevices(dtMs: number, base: DeviceStates = devices): void {
    try {
      devices = stepDevices(aircraft, registry, { ...buildState(), devices: base }, dtMs);
    } catch (error) {
      devices = base;
      deviceFailure = { kind: 'failed', error };
    }
  }

  function enterPhase(id: string): void {
    const next = entrySnapshot(aircraft, registry, id);
    phase = id;
    environment = next.environment;
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
    procedureId = undefined;
    checklist = undefined;
    store.load(snapshot.positions);
    failureSet.clearAll();
    runtime.setEnvironment(snapshot.environment);
    runtime.onControlsChanged(store.positions());
    runtime.reset(snapshot.systems);
    deviceFailure = undefined;
    settleDevices(0, snapshot.devices);
    phase = id;
    environment = snapshot.environment;
  }

  store.subscribe((change: ControlChange) => {
    dirty = true;
    try {
      runtime.onControlsChanged(store.positions());
      if (runtime.status().kind === 'running') settleDevices(0);
      if (checklist) track(observeControl(checklist, change, buildState()));
    } finally {
      dirty = true;
    }
    notify();
  });

  loadSnapshot(initialPhase);

  const pilot =
    <A extends unknown[]>(input: (...args: A) => ControlResult) =>
    (...args: A): SessionControlResult =>
      failed() ? FAILED : input(...args);

  return {
    phase: () => phase,
    environment: () => environment,
    state: () => (refresh(), cachedState),
    guards: () => (refresh(), cachedGuards),
    failures: () => (refresh(), cachedFailures),
    status,
    procedureId: () => procedureId,
    checklist: () => checklist,

    set: pilot(store.set),
    press: pilot(store.press),
    release: pilot(store.release),
    openGuard: pilot(store.openGuard),
    closeGuard: pilot(store.closeGuard),

    jumpToPhase: (id) => batch(() => loadSnapshot(id)),

    startProcedure(id) {
      const procedure = procedureOf(aircraft, id);
      if (procedure.type === 'emergency' && !Object.hasOwn(aircraft.failures, procedure.failure)) {
        throw new Error(`Procedure "${id}" names unknown failure "${procedure.failure}"`);
      }
      batch(() => {
        loadSnapshot(procedure.startPhase);
        if (procedure.type === 'emergency') {
          failureSet.inject(procedure.failure);
          runtime.onControlsChanged(store.positions());
          settleDevices(0);
        }
        procedureId = id;
        track(startChecklist(procedure, buildState()));
      });
    },

    advance(dtMs) {
      if (failed()) {
        if (!Number.isFinite(dtMs) || dtMs < 0) {
          throw new RangeError(`dtMs must be a finite number >= 0, got ${dtMs}`);
        }
        return;
      }
      runtime.advance(dtMs);
      dirty = true;
      try {
        if (runtime.status().kind === 'running') settleDevices(dtMs);
        if (checklist) track(observeState(checklist, buildState()));
      } finally {
        dirty = true;
      }
      notify();
    },

    checkOff() {
      if (!checklist || failed()) return;
      try {
        track(checkOff(checklist, buildState()));
      } finally {
        dirty = true;
      }
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

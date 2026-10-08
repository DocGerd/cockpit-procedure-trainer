import { checkOff, observeControl, observeState, retryItem, startChecklist } from '../checklist';
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
import { assertDtMs, createSystemsRuntime } from '../runtime';
import type { RuntimeStatus } from '../runtime';

export type SessionOptions = {
  readonly devices?: readonly Device[];
  readonly phase?: string;
};

export type SurpriseOptions = {
  readonly phase: string;
  readonly failure: string;
  readonly delayMs: number;
};

/** A surprise failure: injected unannounced, then answered by the checklist the pilot chooses. */
export type Scenario = SurpriseOptions & {
  /** Run time at which the failure appeared; unset while it is pending. */
  readonly injectedAtMs?: number;
  readonly chosen?: string;
  /** From the failure to the choice; unset when the pilot chose before it appeared. */
  readonly recognitionMs?: number;
  /** Whether the chosen checklist is an emergency procedure for the injected failure. */
  readonly matched?: boolean;
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
  scenario(): Scenario | undefined;
  set(id: string, position: string | number): SessionControlResult;
  press(id: string, position?: string | number): SessionControlResult;
  release(id: string): SessionControlResult;
  openGuard(id: string): SessionControlResult;
  closeGuard(id: string): SessionControlResult;
  jumpToPhase(id: string): void;
  startProcedure(id: string): void;
  /** Loads the phase snapshot and injects the failure once `delayMs` of run time has passed. */
  startSurprise(options: SurpriseOptions): void;
  /**
   * Starts a checklist from the cockpit as it stands: no snapshot load and no failure of its own.
   * The first one taken during a surprise is the pilot's answer to it.
   */
  takeChecklist(id: string): void;
  advance(dtMs: number): void;
  checkOff(response?: number): void;
  /** Puts the cockpit back as it was when the current item began and counts an assist. */
  retryItem(): void;
  subscribe(listener: () => void): () => void;
};

const FAILED: SessionControlResult = { applied: false, reason: 'failed' };

export function createSession(aircraft: Aircraft, options: SessionOptions = {}): Session {
  const registry = options.devices ?? [];
  const initialPhase = options.phase ?? Object.keys(aircraft.phases)[0];
  if (initialPhase === undefined) throw new Error(`Aircraft "${aircraft.id}" has no phases`);
  const initial = entrySnapshot(aircraft, registry, initialPhase);

  const controls = { ...aircraft.controls, ...deviceControls(aircraft, registry) };
  const store = createControlStore(controls);
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
  let runMs = 0;
  let scenario: Scenario | undefined;
  let itemStart:
    | {
        readonly completed: number;
        readonly positions: ReturnType<typeof store.positions>;
        readonly guards: ReturnType<typeof store.guards>;
        readonly systems: unknown;
        readonly devices: DeviceStates;
      }
    | undefined;
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
    checklist = next.done && !wasDone ? { ...next, elapsedMs: runMs } : next;
    if (next.done) itemStart = undefined;
    // Keyed on completions, not `current`: a flow ticks items without moving `current`.
    else if (itemStart?.completed !== next.completed.length) {
      itemStart = {
        completed: next.completed.length,
        positions: store.positions(),
        guards: store.guards(),
        systems: runtime.state(),
        devices,
      };
    }
    const endPhase = next.procedure.endPhase;
    if (next.done && !wasDone && endPhase !== undefined) enterPhase(endPhase);
  }

  function loadSnapshot(id: string): void {
    const snapshot = entrySnapshot(aircraft, registry, id);
    procedureId = undefined;
    checklist = undefined;
    itemStart = undefined;
    scenario = undefined;
    runMs = 0;
    store.load(snapshot.positions, snapshot.guards);
    failureSet.clearAll();
    runtime.setEnvironment(snapshot.environment);
    runtime.onControlsChanged(store.positions());
    runtime.reset(snapshot.systems);
    deviceFailure = undefined;
    settleDevices(0, snapshot.devices);
    phase = id;
    environment = snapshot.environment;
  }

  function injectSurprise(): void {
    if (!scenario || scenario.injectedAtMs !== undefined) return;
    scenario = { ...scenario, injectedAtMs: runMs };
    failureSet.inject(scenario.failure);
    runtime.onControlsChanged(store.positions());
    settleDevices(0);
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
    scenario: () => scenario,

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
        track(startChecklist(procedure, buildState(), controls));
      });
    },

    startSurprise(options) {
      const { phase: id, failure, delayMs } = options;
      if (!Object.hasOwn(aircraft.failures, failure))
        throw new Error(`Unknown failure "${failure}"`);
      assertDtMs(delayMs);
      entrySnapshot(aircraft, registry, id);
      batch(() => {
        loadSnapshot(id);
        scenario = { phase: id, failure, delayMs };
      });
    },

    takeChecklist(id) {
      const procedure = procedureOf(aircraft, id);
      batch(() => {
        if (scenario && scenario.chosen === undefined) {
          const early = scenario.injectedAtMs === undefined;
          injectSurprise();
          const answer = scenario;
          scenario = {
            ...answer,
            chosen: id,
            matched: procedure.type === 'emergency' && procedure.failure === answer.failure,
            ...(early ? {} : { recognitionMs: runMs - (answer.injectedAtMs ?? 0) }),
          };
        }
        runMs = 0;
        itemStart = undefined;
        checklist = undefined;
        procedureId = id;
        track(startChecklist(procedure, buildState(), controls));
      });
    },

    advance(dtMs) {
      if (failed()) {
        assertDtMs(dtMs);
        return;
      }
      runtime.advance(dtMs);
      runMs += dtMs;
      dirty = true;
      try {
        if (scenario && scenario.injectedAtMs === undefined && runMs >= scenario.delayMs) {
          depth++;
          try {
            injectSurprise();
          } finally {
            depth--;
          }
        }
        if (runtime.status().kind === 'running') settleDevices(dtMs);
        if (checklist) track(observeState(checklist, buildState()));
      } finally {
        dirty = true;
      }
      notify();
    },

    checkOff(response) {
      if (!checklist || failed()) return;
      try {
        track(checkOff(checklist, buildState(), response));
      } finally {
        dirty = true;
      }
      notify();
    },

    retryItem() {
      const running = checklist;
      const start = itemStart;
      if (!running || running.done || !start || failed()) return;
      batch(() => {
        checklist = undefined;
        try {
          store.load(start.positions, start.guards);
        } finally {
          checklist = running;
        }
        runtime.onControlsChanged(store.positions());
        runtime.reset(start.systems);
        settleDevices(0, start.devices);
        track(retryItem(running));
      });
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

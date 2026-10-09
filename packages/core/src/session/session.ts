import { checkOff, observeControl, observeState, retryItem, startChecklist } from '../checklist';
import type { ChecklistState } from '../checklist';
import { phaseOrder, sharedPhases } from '../contract';
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

/** A surprise failure in a full-flight leg: it appears after this many of the leg's items. */
export type LegSurprise = {
  readonly failure: string;
  readonly afterItems: number;
};

/** A surprise failure: injected unannounced, then answered by the checklist the pilot chooses. */
export type Scenario = {
  readonly phase: string;
  readonly failure: string;
  /** Run time after which the failure appears, in a surprise drill. */
  readonly delayMs?: number;
  /**
   * In a flight leg, the count of the leg's items done at which the failure appears, at the
   * latest when the leg is done.
   */
  readonly afterItems?: number;
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
  /**
   * Starts a normal procedure as the next leg of a flight. In the current phase or the one right
   * after it, the leg starts from the cockpit as it stands; otherwise from its phase snapshot.
   * A surprise counts the items the pilot does in the leg, not those already in place.
   */
  startLeg(id: string, surprise?: LegSurprise): void;
  /**
   * Puts the cockpit and phase back as they were when the current leg began and starts it over.
   * Once the pilot answered a leg's surprise, the leg is the chosen checklist from that choice.
   */
  restartLeg(): void;
  advance(dtMs: number): void;
  checkOff(response?: number): void;
  /** Puts the cockpit back as it was when the current item began and counts an assist. */
  retryItem(): void;
  subscribe(listener: () => void): () => void;
};

const FAILED: SessionControlResult = { applied: false, reason: 'failed' };

export function createSession(aircraft: Aircraft, options: SessionOptions = {}): Session {
  const registry = options.devices ?? [];
  const initialPhase = options.phase ?? sharedPhases[0].id;
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
  let legStart:
    | {
        readonly id: string;
        readonly phase: string;
        readonly positions: ReturnType<typeof store.positions>;
        readonly guards: ReturnType<typeof store.guards>;
        readonly systems: unknown;
        readonly devices: DeviceStates;
        readonly scenario: Scenario | undefined;
      }
    | undefined;
  let deviceFailure: RuntimeStatus | undefined;
  let depth = 0;
  const listeners = new Set<() => void>();

  const status = (): RuntimeStatus => deviceFailure ?? runtime.status();
  const failed = () => status().kind === 'failed';

  const buildState = (): TrainerState<unknown> => ({
    controls: store.positions(),
    guards: store.guards(),
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

  function setPhase(id: string) {
    const next = entrySnapshot(aircraft, registry, id);
    phase = id;
    environment = next.environment;
    runtime.setEnvironment(environment);
    return next;
  }

  function enterPhase(id: string): void {
    const next = setPhase(id);
    if (failed()) return;
    runtime.carry(next.systems);
    runtime.onControlsChanged(store.positions());
    if (runtime.status().kind === 'running') settleDevices(0);
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
    if (
      scenario?.afterItems !== undefined &&
      (next.completed.length >= scenario.afterItems || next.done)
    ) {
      depth++;
      try {
        injectSurprise();
      } finally {
        depth--;
      }
    }
    const endPhase = next.procedure.endPhase;
    if (next.done && !wasDone && endPhase !== undefined) enterPhase(endPhase);
  }

  function loadSnapshot(id: string): void {
    const snapshot = entrySnapshot(aircraft, registry, id);
    procedureId = undefined;
    checklist = undefined;
    itemStart = undefined;
    legStart = undefined;
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

  function beginChecklist(id: string): void {
    runMs = 0;
    itemStart = undefined;
    checklist = undefined;
    procedureId = id;
    track(startChecklist(procedureOf(aircraft, id), buildState(), controls));
  }

  function markLegStart(id: string): void {
    legStart = {
      id,
      phase,
      positions: store.positions(),
      guards: store.guards(),
      systems: runtime.state(),
      devices,
      scenario,
    };
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
        const answersLeg =
          legStart !== undefined &&
          scenario?.afterItems !== undefined &&
          scenario.chosen === undefined;
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
        if (answersLeg) markLegStart(id);
        else legStart = undefined;
        beginChecklist(id);
      });
    },

    startLeg(id, surprise) {
      const procedure = procedureOf(aircraft, id);
      if (procedure.type !== 'normal')
        throw new Error(`Procedure "${id}" is not a normal procedure`);
      if (surprise && !Object.hasOwn(aircraft.failures, surprise.failure))
        throw new Error(`Unknown failure "${surprise.failure}"`);
      const order: readonly string[] = phaseOrder;
      const step = order.indexOf(procedure.startPhase) - order.indexOf(phase);
      batch(() => {
        // A phase no leg flies through is flown off the checklist; its snapshot stands for it.
        if (step === 1) enterPhase(procedure.startPhase);
        else if (step !== 0) loadSnapshot(procedure.startPhase);
        scenario = undefined;
        markLegStart(id);
        beginChecklist(id);
        if (surprise && checklist && legStart) {
          const start = checklist.completed.length;
          // Items in place at the start can push the count past the last item; keep one after it.
          const lastButOne = Math.max(start + 1, procedure.items.length - 1);
          scenario = {
            phase: legStart.phase,
            failure: surprise.failure,
            afterItems: Math.min(start + surprise.afterItems, lastButOne),
          };
          legStart = { ...legStart, scenario };
        }
      });
    },

    restartLeg() {
      const start = legStart;
      if (!start) return;
      batch(() => {
        checklist = undefined;
        store.load(start.positions, start.guards);
        setPhase(start.phase);
        failureSet.clearAll();
        scenario = start.scenario;
        if (scenario?.injectedAtMs !== undefined) failureSet.inject(scenario.failure);
        runtime.onControlsChanged(store.positions());
        runtime.reset(start.systems);
        deviceFailure = undefined;
        settleDevices(0, start.devices);
        beginChecklist(start.id);
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
        if (
          scenario?.delayMs !== undefined &&
          scenario.injectedAtMs === undefined &&
          runMs >= scenario.delayMs
        ) {
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

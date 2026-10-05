import type { Environment, Positions, SystemsDefinition } from '../contract';

export const STEP_MS = 50;

export type RuntimeStatus =
  { readonly kind: 'running' } | { readonly kind: 'failed'; readonly error: unknown };

export type SystemsRuntimeOptions = {
  readonly environment: Environment;
  readonly controls?: Positions;
};

export type SystemsRuntime<S, F extends string = string> = {
  onControlsChanged(positions: Positions): void;
  advance(dtMs: number): void;
  setEnvironment(environment: Environment): void;
  setFailures(failures: ReadonlySet<F>): void;
  reset(state: S): void;
  state(): S;
  status(): RuntimeStatus;
  subscribe(listener: () => void): () => void;
};

export function createSystemsRuntime<S, F extends string = string>(
  systems: SystemsDefinition<S, F>,
  options: SystemsRuntimeOptions,
): SystemsRuntime<S, F> {
  let state = systems.initial;
  let status: RuntimeStatus = { kind: 'running' };
  let controls: Positions = options.controls ?? {};
  let environment = options.environment;
  let failures: ReadonlySet<F> = new Set();
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of [...listeners]) listener();
  };

  const stepBy = (dtMs: number) => {
    if (status.kind === 'failed') return;
    try {
      state = systems.step(state, { controls, failures, environment, dtMs });
    } catch (error) {
      status = { kind: 'failed', error };
    }
    notify();
  };

  return {
    onControlsChanged(positions) {
      controls = positions;
      stepBy(0);
    },
    advance: stepBy,
    setEnvironment(next) {
      environment = next;
    },
    setFailures(next) {
      failures = new Set(next);
    },
    reset(next) {
      state = next;
      status = { kind: 'running' };
      notify();
    },
    state: () => state,
    status: () => status,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

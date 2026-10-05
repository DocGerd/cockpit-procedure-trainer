import { describe, expect, it, vi } from 'vitest';
import type { Environment, Positions, StepInput, SystemsDefinition } from '../contract';
import { createSystemsRuntime, STEP_MS } from './index';

type State = { elapsedMs: number; steps: number; last: StepInput | undefined };

const ground: Environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };
const cruise: Environment = { airspeedKt: 110, altitudeFt: 4500, onGround: false };

const initial: State = { elapsedMs: 0, steps: 0, last: undefined };

const counting: SystemsDefinition<State> = {
  initial,
  step: (state, input) => ({
    elapsedMs: state.elapsedMs + input.dtMs,
    steps: state.steps + 1,
    last: input,
  }),
};

function run(dts: readonly number[]): State {
  const runtime = createSystemsRuntime(counting, { environment: ground });
  for (const dt of dts) runtime.advance(dt);
  return runtime.state();
}

describe('createSystemsRuntime', () => {
  it('starts from the initial state, running', () => {
    const runtime = createSystemsRuntime(counting, { environment: ground });
    expect(runtime.state()).toBe(initial);
    expect(runtime.status()).toEqual({ kind: 'running' });
  });

  it('exports a positive fixed step length for the app driver', () => {
    expect(STEP_MS).toBeGreaterThan(0);
  });

  it('advances time identically across runs for the same advance sequence', () => {
    const dts = [STEP_MS, STEP_MS, 7, STEP_MS, 0, 123];
    const a = run(dts);
    const b = run(dts);
    expect(a.elapsedMs).toBe(dts.reduce((sum, dt) => sum + dt, 0));
    expect(b).toEqual(a);
  });

  it('steps with the given dtMs on advance and dtMs 0 on a control change', () => {
    const runtime = createSystemsRuntime(counting, { environment: ground });
    runtime.advance(40);
    expect(runtime.state().last?.dtMs).toBe(40);
    runtime.onControlsChanged({ master: 'on' });
    expect(runtime.state().last?.dtMs).toBe(0);
    expect(runtime.state().elapsedMs).toBe(40);
    expect(runtime.state().steps).toBe(2);
  });

  it('passes the latest positions to step, also on later advances', () => {
    const runtime = createSystemsRuntime(counting, { environment: ground });
    const positions: Positions = { master: 'on' };
    runtime.onControlsChanged(positions);
    expect(runtime.state().last?.controls).toEqual({ master: 'on' });
    runtime.advance(STEP_MS);
    expect(runtime.state().last?.controls).toEqual({ master: 'on' });
  });

  it('uses the positions given at creation until a control change arrives', () => {
    const runtime = createSystemsRuntime(counting, {
      environment: ground,
      controls: { master: 'off' },
    });
    runtime.advance(STEP_MS);
    expect(runtime.state().last?.controls).toEqual({ master: 'off' });
  });

  it('passes the environment to step and uses a later one from the next step', () => {
    const runtime = createSystemsRuntime(counting, { environment: ground });
    runtime.advance(STEP_MS);
    expect(runtime.state().last?.environment).toEqual(ground);
    runtime.setEnvironment(cruise);
    expect(runtime.state().steps).toBe(1);
    runtime.advance(STEP_MS);
    expect(runtime.state().last?.environment).toEqual(cruise);
  });

  it('passes failures set via setFailures to step', () => {
    const runtime = createSystemsRuntime(counting, { environment: ground });
    runtime.advance(STEP_MS);
    expect([...(runtime.state().last?.failures ?? [])]).toEqual([]);
    runtime.setFailures(new Set(['alternatorFailure']));
    runtime.onControlsChanged({});
    expect(runtime.state().last?.failures.has('alternatorFailure')).toBe(true);
  });

  it('does not see later mutation of a failure set it was given', () => {
    const runtime = createSystemsRuntime(counting, { environment: ground });
    const failures = new Set(['a']);
    runtime.setFailures(failures);
    failures.add('b');
    runtime.advance(STEP_MS);
    expect([...(runtime.state().last?.failures ?? [])]).toEqual(['a']);
  });

  it('notifies subscribers after each step and stops after unsubscribe', () => {
    const runtime = createSystemsRuntime(counting, { environment: ground });
    const listener = vi.fn();
    const unsubscribe = runtime.subscribe(listener);
    runtime.advance(STEP_MS);
    runtime.onControlsChanged({});
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    runtime.advance(STEP_MS);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  describe('a listener that throws', () => {
    it('still notifies the others, advances the state, stays running, then rethrows the first error', () => {
      const runtime = createSystemsRuntime(counting, { environment: ground });
      const first = new Error('first');
      const after = vi.fn();
      runtime.subscribe(() => {
        throw first;
      });
      runtime.subscribe(() => {
        throw new Error('second');
      });
      runtime.subscribe(after);
      expect(() => runtime.advance(STEP_MS)).toThrow(first);
      expect(after).toHaveBeenCalledTimes(1);
      expect(runtime.state().elapsedMs).toBe(STEP_MS);
      expect(runtime.status()).toEqual({ kind: 'running' });
    });

    it('does the same on onControlsChanged and on reset', () => {
      const runtime = createSystemsRuntime(counting, { environment: ground });
      const boom = new Error('listener');
      const after = vi.fn();
      runtime.subscribe(() => {
        throw boom;
      });
      runtime.subscribe(after);
      expect(() => runtime.onControlsChanged({ master: 'on' })).toThrow(boom);
      expect(runtime.state().steps).toBe(1);
      expect(() => runtime.reset(initial)).toThrow(boom);
      expect(runtime.state()).toBe(initial);
      expect(after).toHaveBeenCalledTimes(2);
      expect(runtime.status()).toEqual({ kind: 'running' });
    });
  });

  describe('an invalid dtMs', () => {
    it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
      'throws a RangeError for %s without stepping or failing',
      (dtMs) => {
        const runtime = createSystemsRuntime(counting, { environment: ground });
        const listener = vi.fn();
        runtime.subscribe(listener);
        expect(() => runtime.advance(dtMs)).toThrow(RangeError);
        expect(runtime.state()).toBe(initial);
        expect(runtime.status()).toEqual({ kind: 'running' });
        expect(listener).not.toHaveBeenCalled();
      },
    );

    it('accepts 0', () => {
      const runtime = createSystemsRuntime(counting, { environment: ground });
      runtime.advance(0);
      expect(runtime.state().steps).toBe(1);
    });
  });

  describe('a step that throws', () => {
    const boom = new Error('step blew up');
    const make = () => {
      let throwNext = false;
      const systems: SystemsDefinition<{ n: number }> = {
        initial: { n: 0 },
        step: (state) => {
          if (throwNext) throw boom;
          return { n: state.n + 1 };
        },
      };
      const runtime = createSystemsRuntime(systems, { environment: ground });
      return {
        runtime,
        failNext: () => {
          throwNext = true;
        },
        recover: () => {
          throwNext = false;
        },
      };
    };

    it('keeps the last good state and reports failed with the error, without throwing', () => {
      const { runtime, failNext } = make();
      runtime.advance(STEP_MS);
      const good = runtime.state();
      failNext();
      expect(() => runtime.advance(STEP_MS)).not.toThrow();
      expect(runtime.state()).toBe(good);
      expect(runtime.status()).toEqual({ kind: 'failed', error: boom });
    });

    it('notifies subscribers of the failure', () => {
      const { runtime, failNext } = make();
      const seen: string[] = [];
      runtime.subscribe(() => seen.push(runtime.status().kind));
      runtime.advance(STEP_MS);
      failNext();
      runtime.advance(STEP_MS);
      expect(seen).toEqual(['running', 'failed']);
    });

    it('stops stepping until reset, for both advance and control changes', () => {
      const { runtime, failNext, recover } = make();
      failNext();
      runtime.advance(STEP_MS);
      recover();
      const listener = vi.fn();
      runtime.subscribe(listener);
      runtime.advance(STEP_MS);
      runtime.onControlsChanged({});
      expect(runtime.state()).toEqual({ n: 0 });
      expect(listener).not.toHaveBeenCalled();
      expect(runtime.status().kind).toBe('failed');
    });

    it('freezes on a throw from onControlsChanged too', () => {
      const { runtime, failNext } = make();
      runtime.onControlsChanged({});
      const good = runtime.state();
      failNext();
      expect(() => runtime.onControlsChanged({ master: 'on' })).not.toThrow();
      expect(runtime.state()).toBe(good);
      expect(runtime.status()).toEqual({ kind: 'failed', error: boom });
    });

    it('reset followed by onControlsChanged recovers and steps', () => {
      const { runtime, failNext, recover } = make();
      failNext();
      runtime.advance(STEP_MS);
      recover();
      runtime.reset({ n: 5 });
      runtime.onControlsChanged({});
      expect(runtime.state()).toEqual({ n: 6 });
      expect(runtime.status()).toEqual({ kind: 'running' });
    });

    it('reset replaces the state, clears the error, notifies and resumes stepping', () => {
      const { runtime, failNext, recover } = make();
      failNext();
      runtime.advance(STEP_MS);
      recover();
      const listener = vi.fn();
      runtime.subscribe(listener);
      runtime.reset({ n: 10 });
      expect(runtime.state()).toEqual({ n: 10 });
      expect(runtime.status()).toEqual({ kind: 'running' });
      expect(listener).toHaveBeenCalledTimes(1);
      runtime.advance(STEP_MS);
      expect(runtime.state()).toEqual({ n: 11 });
    });
  });

  it('reset on a running runtime replaces the state', () => {
    const runtime = createSystemsRuntime(counting, { environment: ground });
    runtime.advance(STEP_MS);
    runtime.reset(initial);
    expect(runtime.state()).toBe(initial);
  });
});

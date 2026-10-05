import { describe, expect, it } from 'vitest';
import type { ControlChange, Environment } from '../contract';
import { fixtureAircraft, STARTER_MS_TO_START } from '../contract/fixtures';
import type { FixtureState } from '../contract/fixtures';
import { createControlStore } from '../controls';
import { createSystemsRuntime } from '../runtime';
import { createFailureSet } from './index';

const environment: Environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };

function setup() {
  const store = createControlStore(fixtureAircraft.controls);
  const runtime = createSystemsRuntime(fixtureAircraft.systems, {
    environment,
    controls: store.positions(),
  });
  store.subscribe(() => runtime.onControlsChanged(store.positions()));
  store.set('master', 'on');
  store.set('ignition', 'start');
  runtime.advance(STARTER_MS_TO_START);
  store.set('ignition', 'both');
  const changes: ControlChange[] = [];
  store.subscribe((change) => changes.push(change));
  const failures = createFailureSet(fixtureAircraft, { store, runtime });
  const volts = () => (runtime.state() as FixtureState).volts;
  return { store, runtime, failures, changes, volts };
}

describe('createFailureSet', () => {
  it('starts with no active failures', () => {
    expect(setup().failures.active().size).toBe(0);
  });

  it('passes the active set to step', () => {
    const { store, runtime, failures, volts } = setup();
    expect(volts()).toBe(14);
    failures.inject('alternatorFailure');
    store.set('alternatorBreaker', 'in');
    runtime.advance(0);
    expect(volts()).toBe(12);
    failures.clear('alternatorFailure');
    runtime.advance(0);
    expect(volts()).toBe(14);
  });

  it('reports the active failures as a snapshot', () => {
    const { failures } = setup();
    failures.inject('alternatorFailure');
    const snapshot = failures.active();
    expect([...snapshot]).toEqual(['alternatorFailure']);
    failures.clearAll();
    expect([...snapshot]).toEqual(['alternatorFailure']);
    expect(failures.active().size).toBe(0);
  });

  it('throws naming the id for an undeclared failure and changes nothing', () => {
    const { store, failures, changes } = setup();
    const inject = failures.inject as (id: string) => void;
    expect(() => inject('engineFire')).toThrow('engineFire');
    expect(() => inject('toString')).toThrow('toString');
    expect(failures.active().size).toBe(0);
    expect(store.positions().alternatorBreaker).toBe('in');
    expect(changes).toEqual([]);
  });

  it('throws naming the id when clearing an undeclared failure', () => {
    const clear = setup().failures.clear as (id: string) => void;
    expect(() => clear('engineFire')).toThrow('engineFire');
  });

  it('pulls the breaker a failure trips with a system change', () => {
    const { store, failures, changes } = setup();
    failures.inject('alternatorFailure');
    expect(store.positions().alternatorBreaker).toBe('pulled');
    expect(changes).toEqual([
      {
        id: 'alternatorBreaker',
        source: 'system',
        kind: 'position',
        from: 'in',
        to: 'pulled',
      },
    ]);
  });

  it('steps the runtime with the failure active when the breaker trips', () => {
    const { failures, volts } = setup();
    expect(volts()).toBe(14);
    failures.inject('alternatorFailure');
    expect(volts()).toBe(12);
  });

  it('does not reset a tripped breaker when the failure clears', () => {
    const { store, failures, changes } = setup();
    failures.inject('alternatorFailure');
    failures.clear('alternatorFailure');
    expect(failures.active().size).toBe(0);
    expect(store.positions().alternatorBreaker).toBe('pulled');
    expect(changes).toHaveLength(1);
  });

  it('treats an already pulled breaker as no error', () => {
    const { store, failures } = setup();
    store.set('alternatorBreaker', 'pulled');
    expect(() => failures.inject('alternatorFailure')).not.toThrow();
    expect([...failures.active()]).toEqual(['alternatorFailure']);
  });

  it('is idempotent for inject and clear', () => {
    const { failures, changes } = setup();
    failures.inject('alternatorFailure');
    failures.inject('alternatorFailure');
    expect(changes).toHaveLength(1);
    failures.clear('alternatorFailure');
    failures.clear('alternatorFailure');
    expect(failures.active().size).toBe(0);
  });

  it('clears every failure with clearAll', () => {
    const { store, runtime, failures, volts } = setup();
    failures.inject('alternatorFailure');
    store.set('alternatorBreaker', 'in');
    failures.clearAll();
    expect(failures.active().size).toBe(0);
    runtime.advance(0);
    expect(volts()).toBe(14);
  });

  it('lets the pilot reset the breaker after the failure cleared', () => {
    const { store, failures } = setup();
    failures.inject('alternatorFailure');
    failures.clear('alternatorFailure');
    expect(store.set('alternatorBreaker', 'in')).toEqual({ applied: true });
  });
});

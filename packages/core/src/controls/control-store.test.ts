import { describe, expect, it } from 'vitest';
import type { ControlChange, ControlRecord, Text } from '../contract';
import { createControlStore } from './control-store';

const text = (de: string, en: string): Text => ({ de, en });
const base = { name: text('Name', 'Name'), description: text('Beschreibung', 'Description') };

const controls = {
  master: { ...base, kind: 'toggle', positions: ['off', 'on'], initial: 'off' },
  ignition: {
    ...base,
    kind: 'rotary',
    positions: ['off', 'right', 'left', 'both', 'start'],
    initial: 'off',
    springBack: { start: 'both' },
  },
  selector: { ...base, kind: 'rotary', positions: ['left', 'both', 'right'], initial: 'both' },
  throttle: { ...base, kind: 'lever', positions: 'continuous', initial: 0 },
  flaps: { ...base, kind: 'lever', positions: ['up', 'half', 'full'], initial: 'up' },
  starter: { ...base, kind: 'momentary', positions: ['released', 'held'], initial: 'released' },
  brs: {
    ...base,
    kind: 'guarded',
    positions: ['stowed', 'deployed'],
    initial: 'stowed',
    guard: { name: text('Abdeckung', 'Cover') },
  },
  alternator: { ...base, kind: 'breaker', positions: ['in', 'pulled'], initial: 'in' },
} as const satisfies ControlRecord;

function setup() {
  const store = createControlStore(controls);
  const changes: ControlChange[] = [];
  store.subscribe((change) => changes.push(change));
  return { store, changes };
}

describe('initial state', () => {
  it('starts every control at its initial position', () => {
    expect(setup().store.positions()).toEqual({
      master: 'off',
      ignition: 'off',
      selector: 'both',
      throttle: 0,
      flaps: 'up',
      starter: 'released',
      brs: 'stowed',
      alternator: 'in',
    });
  });

  it('starts every guard closed', () => {
    expect(setup().store.guards()).toEqual({ brs: 'closed' });
  });

  it('returns a snapshot that later changes do not touch', () => {
    const { store } = setup();
    const before = store.positions();
    store.set('master', 'on');
    expect(before.master).toBe('off');
    expect(store.positions().master).toBe('on');
  });
});

describe('set', () => {
  it('moves a control and emits a pilot position change', () => {
    const { store, changes } = setup();
    expect(store.set('master', 'on')).toEqual({ applied: true });
    expect(changes).toEqual([
      { id: 'master', source: 'pilot', kind: 'position', from: 'off', to: 'on' },
    ]);
  });

  it('accepts a number on a continuous lever', () => {
    const { store, changes } = setup();
    store.set('throttle', 0.5);
    expect(store.positions().throttle).toBe(0.5);
    expect(changes).toEqual([
      { id: 'throttle', source: 'pilot', kind: 'position', from: 0, to: 0.5 },
    ]);
  });

  it('reports an unchanged position and emits nothing', () => {
    const { store, changes } = setup();
    expect(store.set('master', 'off')).toEqual({ applied: false, reason: 'unchanged' });
    expect(changes).toEqual([]);
  });

  it('throws on an unknown id', () => {
    const { store } = setup();
    expect(() => store.set('nope' as never, 'on')).toThrow('nope');
    expect(() => store.set('constructor' as never, 'on')).toThrow('constructor');
  });

  it('throws on a position the control does not have, naming both', () => {
    const { store, changes } = setup();
    expect(() => store.set('master', 'sideways')).toThrow(/master.*sideways/);
    expect(() => store.set('flaps', 0.5)).toThrow(/flaps/);
    expect(changes).toEqual([]);
  });

  it('throws on a continuous value outside 0 to 1 or not finite', () => {
    const { store } = setup();
    expect(() => store.set('throttle', 1.5)).toThrow(/throttle/);
    expect(() => store.set('throttle', -0.1)).toThrow(/throttle/);
    expect(() => store.set('throttle', Number.NaN)).toThrow(/throttle/);
    expect(() => store.set('throttle', 'full')).toThrow(/throttle/);
  });

  it('throws on a momentary control, which is operated with press and release', () => {
    expect(() => setup().store.set('starter', 'held')).toThrow(/starter/);
  });
});

describe('spring-return detent', () => {
  it('stays at the detent until released', () => {
    const { store } = setup();
    store.set('ignition', 'start');
    expect(store.positions().ignition).toBe('start');
  });

  it('goes back on release with source spring', () => {
    const { store, changes } = setup();
    store.set('ignition', 'start');
    changes.length = 0;
    expect(store.release('ignition')).toEqual({ applied: true });
    expect(store.positions().ignition).toBe('both');
    expect(changes).toEqual([
      { id: 'ignition', source: 'spring', kind: 'position', from: 'start', to: 'both' },
    ]);
  });

  it('springs back on release after the detent was reached by systemSet or load', () => {
    for (const reach of [
      (store: ReturnType<typeof setup>['store']) => store.systemSet('ignition', 'start'),
      (store: ReturnType<typeof setup>['store']) => store.load({ ignition: 'start' }),
    ]) {
      const { store, changes } = setup();
      reach(store);
      changes.length = 0;
      expect(store.release('ignition')).toEqual({ applied: true });
      expect(changes).toEqual([
        { id: 'ignition', source: 'spring', kind: 'position', from: 'start', to: 'both' },
      ]);
    }
  });

  it('press moves to a spring detent as a pilot change', () => {
    const { store, changes } = setup();
    store.press('ignition', 'start');
    expect(changes).toEqual([
      { id: 'ignition', source: 'pilot', kind: 'position', from: 'off', to: 'start' },
    ]);
  });

  it('release away from the detent changes nothing', () => {
    const { store, changes } = setup();
    store.set('ignition', 'left');
    changes.length = 0;
    expect(store.release('ignition')).toEqual({ applied: false, reason: 'unchanged' });
    expect(store.positions().ignition).toBe('left');
    expect(changes).toEqual([]);
  });

  it('press on a rotary without a position, or at a detent that does not spring, throws', () => {
    const { store } = setup();
    expect(() => store.press('ignition')).toThrow(/ignition/);
    expect(() => store.press('ignition', 'left')).toThrow(/ignition/);
    expect(() => store.press('selector', 'left')).toThrow(/selector/);
  });
});

describe('momentary control', () => {
  it('is active only between press and release', () => {
    const { store } = setup();
    expect(store.positions().starter).toBe('released');
    store.press('starter');
    expect(store.positions().starter).toBe('held');
    store.release('starter');
    expect(store.positions().starter).toBe('released');
  });

  it('emits a pilot change on press and a spring change on release', () => {
    const { store, changes } = setup();
    store.press('starter');
    store.release('starter');
    expect(changes).toEqual([
      { id: 'starter', source: 'pilot', kind: 'position', from: 'released', to: 'held' },
      { id: 'starter', source: 'spring', kind: 'position', from: 'held', to: 'released' },
    ]);
  });

  it('accepts the held position explicitly and rejects any other', () => {
    const { store } = setup();
    expect(store.press('starter', 'held')).toEqual({ applied: true });
    store.release('starter');
    expect(() => store.press('starter', 'released')).toThrow(/starter/);
  });

  it('ignores a second press and a release while at rest', () => {
    const { store, changes } = setup();
    expect(store.release('starter')).toEqual({ applied: false, reason: 'unchanged' });
    store.press('starter');
    expect(store.press('starter')).toEqual({ applied: false, reason: 'unchanged' });
    expect(changes).toHaveLength(1);
  });
});

describe('press and release on controls that do not spring', () => {
  it('press throws', () => {
    expect(() => setup().store.press('master', 'on')).toThrow(/master/);
    expect(() => setup().store.press('flaps', 'half')).toThrow(/flaps/);
    expect(() => setup().store.press('throttle', 0.5)).toThrow(/throttle/);
  });

  it('release leaves the control where it is', () => {
    const { store, changes } = setup();
    store.set('master', 'on');
    changes.length = 0;
    expect(store.release('master')).toEqual({ applied: false, reason: 'unchanged' });
    expect(store.positions().master).toBe('on');
    expect(changes).toEqual([]);
  });

  it('release throws on an unknown id', () => {
    expect(() => setup().store.release('nope' as never)).toThrow('nope');
  });
});

describe('guarded control', () => {
  it('refuses set while the guard is closed', () => {
    const { store, changes } = setup();
    expect(store.set('brs', 'deployed')).toEqual({ applied: false, reason: 'guarded' });
    expect(store.positions().brs).toBe('stowed');
    expect(changes).toEqual([]);
  });

  it('reports the current position as unchanged, not guarded, while the guard is closed', () => {
    const { store, changes } = setup();
    expect(store.set('brs', 'stowed')).toEqual({ applied: false, reason: 'unchanged' });
    expect(changes).toEqual([]);
  });

  it('throws on an invalid position while the guard is closed', () => {
    expect(() => setup().store.set('brs', 'bogus')).toThrow(/brs.*bogus/);
  });

  it('cannot be pressed', () => {
    const { store } = setup();
    store.openGuard('brs');
    expect(() => store.press('brs', 'deployed')).toThrow(/brs/);
  });

  it('accepts set once the guard is open', () => {
    const { store, changes } = setup();
    store.openGuard('brs');
    changes.length = 0;
    expect(store.set('brs', 'deployed')).toEqual({ applied: true });
    expect(store.positions().brs).toBe('deployed');
    expect(changes).toEqual([
      { id: 'brs', source: 'pilot', kind: 'position', from: 'stowed', to: 'deployed' },
    ]);
  });

  it('refuses set again after the guard closes', () => {
    const { store } = setup();
    store.openGuard('brs');
    store.closeGuard('brs');
    expect(store.set('brs', 'deployed')).toEqual({ applied: false, reason: 'guarded' });
  });

  it('emits guard changes with source pilot', () => {
    const { store, changes } = setup();
    expect(store.openGuard('brs')).toEqual({ applied: true });
    expect(store.guards()).toEqual({ brs: 'open' });
    expect(store.closeGuard('brs')).toEqual({ applied: true });
    expect(store.guards()).toEqual({ brs: 'closed' });
    expect(changes).toEqual([
      { id: 'brs', source: 'pilot', kind: 'guard', from: 'closed', to: 'open' },
      { id: 'brs', source: 'pilot', kind: 'guard', from: 'open', to: 'closed' },
    ]);
  });

  it('reports a guard that is already in the requested state', () => {
    const { store, changes } = setup();
    expect(store.closeGuard('brs')).toEqual({ applied: false, reason: 'unchanged' });
    store.openGuard('brs');
    expect(store.openGuard('brs')).toEqual({ applied: false, reason: 'unchanged' });
    expect(changes).toHaveLength(1);
  });

  it('throws when the control has no guard, or the id is unknown', () => {
    const { store } = setup();
    expect(() => store.openGuard('master')).toThrow(/master/);
    expect(() => store.closeGuard('master')).toThrow(/master/);
    expect(() => store.openGuard('nope' as never)).toThrow('nope');
  });
});

describe('systemSet', () => {
  it('moves a control and emits a system change', () => {
    const { store, changes } = setup();
    expect(store.systemSet('alternator', 'pulled')).toEqual({ applied: true });
    expect(store.positions().alternator).toBe('pulled');
    expect(changes).toEqual([
      { id: 'alternator', source: 'system', kind: 'position', from: 'in', to: 'pulled' },
    ]);
  });

  it('moves a guarded control while its guard is closed', () => {
    const { store } = setup();
    expect(store.systemSet('brs', 'deployed')).toEqual({ applied: true });
    expect(store.positions().brs).toBe('deployed');
  });

  it('reports an unchanged position and emits nothing', () => {
    const { store, changes } = setup();
    expect(store.systemSet('alternator', 'in')).toEqual({ applied: false, reason: 'unchanged' });
    expect(changes).toEqual([]);
  });

  it('throws on an unknown id or an invalid position', () => {
    const { store } = setup();
    expect(() => store.systemSet('nope' as never, 'in')).toThrow('nope');
    expect(() => store.systemSet('alternator', 'out')).toThrow(/alternator/);
  });
});

describe('load', () => {
  it('replaces positions and emits one system change per moved control', () => {
    const { store, changes } = setup();
    store.load({ master: 'on', throttle: 0.25, selector: 'both', flaps: 'half' });
    expect(store.positions()).toMatchObject({
      master: 'on',
      throttle: 0.25,
      selector: 'both',
      flaps: 'half',
    });
    expect(changes).toEqual([
      { id: 'master', source: 'system', kind: 'position', from: 'off', to: 'on' },
      { id: 'throttle', source: 'system', kind: 'position', from: 0, to: 0.25 },
      { id: 'flaps', source: 'system', kind: 'position', from: 'up', to: 'half' },
    ]);
  });

  it('emits nothing for controls that did not move', () => {
    const { store, changes } = setup();
    store.load(store.positions());
    expect(changes).toEqual([]);
  });

  it('can restore a held momentary control and a guarded control behind a closed guard', () => {
    const { store } = setup();
    store.load({ starter: 'held', brs: 'deployed' });
    expect(store.positions()).toMatchObject({ starter: 'held', brs: 'deployed' });
  });

  it('closes every open guard with a system guard change', () => {
    const { store, changes } = setup();
    store.openGuard('brs');
    changes.length = 0;
    store.load({ master: 'on' });
    expect(store.guards()).toEqual({ brs: 'closed' });
    expect(changes).toEqual([
      { id: 'master', source: 'system', kind: 'position', from: 'off', to: 'on' },
      { id: 'brs', source: 'system', kind: 'guard', from: 'open', to: 'closed' },
    ]);
  });

  it('opens the guards it is given and closes the rest, with system guard changes', () => {
    const { store, changes } = setup();
    store.load({ master: 'on' }, { brs: 'open' });
    expect(store.guards()).toEqual({ brs: 'open' });
    expect(changes).toEqual([
      { id: 'master', source: 'system', kind: 'position', from: 'off', to: 'on' },
      { id: 'brs', source: 'system', kind: 'guard', from: 'closed', to: 'open' },
    ]);
    changes.length = 0;
    store.load({ master: 'on' }, { brs: 'open' });
    expect(changes).toEqual([]);
    store.load({ master: 'on' });
    expect(store.guards()).toEqual({ brs: 'closed' });
  });

  it('throws on a guard position for a control without a guard, changing nothing', () => {
    const { store, changes } = setup();
    expect(() => store.load({ master: 'on' }, { master: 'open' })).toThrow(/master/);
    expect(() => store.load({ master: 'on' }, { ghost: 'open' })).toThrow(/ghost/);
    expect(store.positions()).toMatchObject({ master: 'off' });
    expect(changes).toEqual([]);
  });

  it('emits no guard change when every guard is already closed', () => {
    const { store, changes } = setup();
    store.load({ master: 'on' });
    expect(changes.filter((change) => change.kind === 'guard')).toEqual([]);
  });

  it('refuses a guarded move again after a load closed the guard', () => {
    const { store } = setup();
    store.openGuard('brs');
    store.load({});
    expect(store.set('brs', 'deployed')).toEqual({ applied: false, reason: 'guarded' });
  });

  it('leaves controls missing from the snapshot where they are', () => {
    const { store } = setup();
    store.set('master', 'on');
    store.load({ flaps: 'full' });
    expect(store.positions().master).toBe('on');
  });

  it('is all or nothing: an invalid entry throws and moves nothing', () => {
    const { store, changes } = setup();
    expect(() => store.load({ master: 'on', flaps: 'nope' })).toThrow(/flaps/);
    expect(() => store.load({ master: 'on', nope: 'on' })).toThrow('nope');
    expect(store.positions().master).toBe('off');
    expect(changes).toEqual([]);
  });

  it('notifies listeners only after every position is replaced', () => {
    const store = createControlStore(controls);
    const seen: unknown[] = [];
    store.subscribe(() => seen.push(store.positions().flaps));
    store.load({ master: 'on', flaps: 'full' });
    expect(seen).toEqual(['full', 'full']);
  });
});

describe('subscribe', () => {
  it('stops notifying after unsubscribe', () => {
    const store = createControlStore(controls);
    const seen: ControlChange[] = [];
    const unsubscribe = store.subscribe((change) => seen.push(change));
    store.set('master', 'on');
    unsubscribe();
    store.set('master', 'off');
    expect(seen).toHaveLength(1);
  });

  it('notifies every listener, and one unsubscribing mid-emit does not skip another', () => {
    const store = createControlStore(controls);
    const calls: string[] = [];
    const first = store.subscribe(() => {
      calls.push('first');
      first();
    });
    store.subscribe(() => calls.push('second'));
    store.set('master', 'on');
    expect(calls).toEqual(['first', 'second']);
  });
});

describe('record shapes', () => {
  it('works over a record assembled at run time, with namespaced ids', () => {
    const combined: ControlRecord = { ...controls, 'gps.power': controls.master };
    const store = createControlStore(combined);
    store.set('gps.power', 'on');
    expect(store.positions()['gps.power']).toBe('on');
  });
});

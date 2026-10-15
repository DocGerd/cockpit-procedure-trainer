import type { ClickId, ControlChange, ControlDefinition, ControlKind } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { clickCount, clickFor } from './click-for';

const label = { de: 'x', en: 'x' };
const base = { name: label, description: label };

const toggle: ControlDefinition = {
  ...base,
  kind: 'toggle',
  positions: ['off', 'on'],
  initial: 'off',
};
const ignition: ControlDefinition = {
  ...base,
  kind: 'rotary',
  positions: ['off', 'right', 'left', 'both', 'start'],
  initial: 'off',
  springBack: { start: 'both' },
};
const radioKnob: ControlDefinition = {
  ...base,
  kind: 'rotary',
  positions: ['down', 'rest', 'up'],
  initial: 'rest',
  springBack: { down: 'rest', up: 'rest' },
};
const selector: ControlDefinition = {
  ...base,
  kind: 'rotary',
  positions: ['a', 'b', 'c', 'd'],
  initial: 'a',
};
const notched: ControlDefinition = {
  ...base,
  kind: 'lever',
  positions: ['up', 'mid', 'down'],
  initial: 'up',
};
const continuous: ControlDefinition = {
  ...base,
  kind: 'lever',
  positions: 'continuous',
  initial: 0,
};
const key: ControlDefinition = {
  ...base,
  kind: 'momentary',
  positions: ['rest', 'held'],
  initial: 'rest',
};
const guarded: ControlDefinition = {
  ...base,
  kind: 'guarded',
  positions: ['off', 'on'],
  initial: 'off',
  guard: { name: label },
};
const breaker: ControlDefinition = {
  ...base,
  kind: 'breaker',
  positions: ['in', 'pulled'],
  initial: 'in',
};

const move = (
  from: string | number,
  to: string | number,
  source: ControlChange['source'] = 'pilot',
): ControlChange => ({ id: 'c', source, kind: 'position', from, to });
const guardMove = (
  from: 'open' | 'closed',
  to: 'open' | 'closed',
  source: ControlChange['source'] = 'pilot',
): ControlChange => ({ id: 'c', source, kind: 'guard', from, to });

describe('clickFor: the kind table', () => {
  const rows: readonly [ControlKind, ControlDefinition, ControlChange, ClickId | undefined][] = [
    ['toggle', toggle, move('off', 'on'), 'rocker'],
    ['rotary', selector, move('a', 'b'), 'detent'],
    ['rotary', ignition, move('both', 'start'), 'detent'],
    ['lever', notched, move('up', 'mid'), 'notch'],
    ['lever', continuous, move(0, 0.5), undefined],
    ['momentary', key, move('rest', 'held'), 'key'],
    ['breaker', breaker, move('in', 'pulled'), 'push-pull'],
    ['guarded', guarded, guardMove('closed', 'open'), 'latch'],
    ['guarded', guarded, move('off', 'on'), 'handle'],
  ];

  it.each(rows)('%s: a pilot change clicks as the table says', (_kind, definition, change, id) => {
    expect(clickFor(definition, change)).toBe(id);
  });

  it('covers every control kind', () => {
    const kinds = new Set<ControlKind>(rows.map(([kind]) => kind));
    expect([...kinds].sort()).toEqual(
      ['breaker', 'guarded', 'lever', 'momentary', 'rotary', 'toggle'].sort(),
    );
  });

  it.each(['spring', 'system'] as const)('a %s change is silent for every kind', (source) => {
    expect(clickFor(toggle, move('off', 'on', source))).toBeUndefined();
    expect(clickFor(ignition, move('start', 'both', source))).toBeUndefined();
    expect(clickFor(key, move('held', 'rest', source))).toBeUndefined();
    expect(clickFor(breaker, move('in', 'pulled', source))).toBeUndefined();
    expect(clickFor(guarded, guardMove('open', 'closed', source))).toBeUndefined();
  });

  it('a move that changes nothing is silent', () => {
    expect(clickFor(toggle, move('on', 'on'))).toBeUndefined();
    expect(clickFor(guarded, guardMove('open', 'open'))).toBeUndefined();
  });

  it('a guard change on a control without a guard is silent', () => {
    expect(clickFor(toggle, guardMove('closed', 'open'))).toBeUndefined();
  });
});

describe('clickFor: a declared click', () => {
  it('wins over the kind table', () => {
    expect(clickFor({ ...toggle, click: 'soft' }, move('off', 'on'))).toBe('soft');
    expect(clickFor({ ...continuous, click: 'notch' }, move(0, 1))).toBe('notch');
  });

  it('covers a guard move too', () => {
    expect(clickFor({ ...guarded, click: 'key' }, guardMove('closed', 'open'))).toBe('key');
    expect(clickFor({ ...guarded, click: 'key' }, move('off', 'on'))).toBe('key');
  });

  it('silent makes no click', () => {
    expect(clickFor({ ...toggle, click: 'silent' }, move('off', 'on'))).toBeUndefined();
  });

  it('does not make a spring or system change click', () => {
    expect(clickFor({ ...key, click: 'soft' }, move('held', 'rest', 'spring'))).toBeUndefined();
    expect(clickFor({ ...breaker, click: 'soft' }, move('in', 'pulled', 'system'))).toBeUndefined();
  });
});

describe('clickCount', () => {
  it('gives one per rotary position stepped', () => {
    expect(clickCount(ignition, move('off', 'both'))).toBe(3);
    expect(clickCount(ignition, move('both', 'off'))).toBe(3);
    expect(clickCount(ignition, move('right', 'left'))).toBe(1);
    expect(clickCount(selector, move('a', 'd'))).toBe(3);
    expect(clickCount(selector, move('d', 'a'))).toBe(3);
  });

  it('gives one for a move into a spring-back position, whatever the distance', () => {
    expect(clickCount(ignition, move('off', 'start'))).toBe(1);
    expect(clickCount(ignition, move('both', 'start'))).toBe(1);
    expect(clickCount(radioKnob, move('rest', 'up'))).toBe(1);
    expect(clickCount(radioKnob, move('rest', 'down'))).toBe(1);
    expect(clickCount(radioKnob, move('up', 'down'))).toBe(1);
    expect(clickCount(radioKnob, move('down', 'up'))).toBe(1);
  });

  it('gives one for every other kind and for a guard change', () => {
    expect(clickCount(toggle, move('off', 'on'))).toBe(1);
    expect(clickCount(notched, move('up', 'down'))).toBe(1);
    expect(clickCount(continuous, move(0, 1))).toBe(1);
    expect(clickCount(key, move('rest', 'held'))).toBe(1);
    expect(clickCount(breaker, move('in', 'pulled'))).toBe(1);
    expect(clickCount(guarded, move('off', 'on'))).toBe(1);
    expect(clickCount(guarded, guardMove('closed', 'open'))).toBe(1);
  });

  it('gives one for a position the control does not list', () => {
    expect(clickCount(selector, move('a', 'nowhere'))).toBe(1);
    expect(clickCount(selector, move('nowhere', 'd'))).toBe(1);
  });

  it('gives one for a rotary move that stays put', () => {
    expect(clickCount(selector, move('b', 'b'))).toBe(1);
  });
});

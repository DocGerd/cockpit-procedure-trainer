import type { Appearance, ControlDefinition, IndicatorValue } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { controlWidgets } from '../controls';
import { indicatorWidgets } from '../indicators';
import {
  checkAppearance,
  controlWidgetKinds,
  indicatorWidgetFit,
  type AppearanceFinding,
} from './appearance-check';

const text = { de: 'x', en: 'x' };
const base = { name: text, description: text };

const toggle = (appearance?: Appearance): ControlDefinition => ({
  ...base,
  kind: 'toggle',
  positions: ['off', 'on'],
  initial: 'off',
  ...(appearance ? { appearance } : {}),
});

const throttle = (appearance?: Appearance): ControlDefinition => ({
  ...base,
  kind: 'lever',
  positions: 'continuous',
  initial: 0,
  ...(appearance ? { appearance } : {}),
});

const check = (
  controls: Record<string, ControlDefinition>,
  indicators: Record<string, Appearance> = {},
  values: Record<string, readonly IndicatorValue[]> = {},
): readonly AppearanceFinding[] =>
  checkAppearance(
    {
      controls,
      indicators: Object.fromEntries(
        Object.entries(indicators).map(([id, appearance]) => [id, { appearance }]),
      ),
    },
    values,
  );

describe('checkAppearance on controls', () => {
  it('accepts a missing appearance, artwork and a fitting widget', () => {
    expect(
      check({
        plain: toggle(),
        rocker: toggle({ widget: 'rocker' }),
        art: toggle({
          artwork: {
            face: 'face.png',
            moving: { type: 'positions', images: { off: 'a.png', on: 'b.png' } },
          },
        }),
      }),
    ).toEqual([]);
  });

  it('reports an unknown widget id, naming the control and the known ids', () => {
    const [finding, ...rest] = check({ master: toggle({ widget: 'fancy' }) });
    expect(rest).toEqual([]);
    expect(finding).toMatchObject({ subject: 'control', id: 'master' });
    expect(finding?.message).toContain('"fancy"');
    expect(finding?.message).toContain('rocker');
  });

  it('does not treat inherited object keys as widget ids', () => {
    expect(check({ master: toggle({ widget: 'toString' }) })).toHaveLength(1);
  });

  it('reports a lever widget on a toggle, naming the kind', () => {
    const [finding, ...rest] = check({ master: toggle({ widget: 'lever' }) });
    expect(rest).toEqual([]);
    expect(finding?.message).toContain('"lever"');
    expect(finding?.message).toContain('toggle');
  });

  it('reports a position widget on a continuous lever', () => {
    expect(check({ throttle: throttle({ widget: 'toggle' }) })).toHaveLength(1);
    expect(check({ throttle: throttle({ widget: 'lever' }) })).toEqual([]);
  });

  it('lists every control with a finding', () => {
    const findings = check({
      a: toggle({ widget: 'fancy' }),
      ok: toggle(),
      b: toggle({ widget: 'lever' }),
    });
    expect(findings.map(({ id }) => id)).toEqual(['a', 'b']);
  });

  it('has a fit entry for every control widget the kit provides, and no stale one', () => {
    expect(Object.keys(controlWidgetKinds).sort()).toEqual(Object.keys(controlWidgets).sort());
  });
});

describe('checkAppearance on indicators', () => {
  it('accepts fitting widgets with valid options', () => {
    expect(
      check(
        {},
        {
          rpm: { widget: 'round-gauge', options: { min: 0, max: 3000, units: 'rpm' } },
          lamp: { widget: 'annunciator', options: { lamp: 'red' } },
          hours: { widget: 'digital-readout', options: { units: 'h', decimals: 1 } },
          plain: { widget: 'round-gauge' },
        },
        { rpm: [0, 1200], lamp: [true, false], hours: [1.5, 'x', true] },
      ),
    ).toEqual([]);
  });

  it('reports an unknown widget id', () => {
    const [finding, ...rest] = check({}, { rpm: { widget: 'dial' } });
    expect(rest).toEqual([]);
    expect(finding).toMatchObject({ subject: 'indicator', id: 'rpm' });
    expect(finding?.message).toContain('"dial"');
    expect(finding?.message).toContain('round-gauge');
  });

  it('reports an annunciator on a number and a gauge on a boolean', () => {
    const findings = check(
      {},
      { amps: { widget: 'annunciator' }, lamp: { widget: 'round-gauge' } },
      { amps: [12], lamp: [false] },
    );
    expect(findings.map(({ id }) => id)).toEqual(['amps', 'lamp']);
    expect(findings[0]?.message).toContain('number');
    expect(findings[1]?.message).toContain('boolean');
  });

  it('reports a gauge on a string value once', () => {
    expect(check({}, { mode: { widget: 'round-gauge' } }, { mode: ['a', 'b'] })).toHaveLength(1);
  });

  it('skips the value check for an indicator without samples', () => {
    expect(check({}, { amps: { widget: 'annunciator' } })).toEqual([]);
  });

  it.each([
    ['round-gauge', { min: 10, max: 5 }],
    ['round-gauge', { arcs: [{ from: 0, to: 1, colour: 'purple' }] }],
    ['round-gauge', { ticks: 'many' }],
    ['annunciator', { lamp: 'pink' }],
    ['annunciator', { stateLabels: { lit: 'on' } }],
    ['digital-readout', { decimals: 1.5 }],
    ['digital-readout', { units: 3 }],
  ] as const)('reports invalid %s options %j', (widget, options) => {
    const [finding, ...rest] = check({}, { gauge: { widget, options } });
    expect(rest).toEqual([]);
    expect(finding).toMatchObject({ subject: 'indicator', id: 'gauge' });
    expect(finding?.message).toContain(widget);
    expect(finding?.message).toContain('options');
  });

  it('has a value entry for every indicator widget the kit provides, and no stale one', () => {
    expect(Object.keys(indicatorWidgetFit).sort()).toEqual(Object.keys(indicatorWidgets).sort());
  });
});

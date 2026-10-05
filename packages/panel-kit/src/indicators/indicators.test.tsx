// @vitest-environment jsdom
import type { IndicatorValue, JsonObject } from '@cpt/core';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { angleAt, SWEEP_END, SWEEP_START } from './geometry';
import { defaultIndicatorWidget, indicatorWidgets } from './index';
import type { IndicatorWidget } from '../types';

afterEach(cleanup);

function widget(id: string): IndicatorWidget {
  const found = indicatorWidgets[id];
  if (found === undefined) throw new Error(`no indicator widget ${id}`);
  return found;
}

function draw(Widget: IndicatorWidget, value: IndicatorValue, options?: JsonObject) {
  const props = options === undefined ? { value, label: 'L' } : { value, label: 'L', options };
  return render(<Widget {...props} />);
}

const gauge = widget('round-gauge');
const annunciator = widget('annunciator');
const readout = widget('digital-readout');

const needleRotation = (container: HTMLElement) => {
  const transform = container.querySelector('[data-needle]')?.getAttribute('transform') ?? '';
  return Number(/^rotate\((-?[\d.]+) /.exec(transform)?.[1]);
};

const range = { min: 10, max: 30 };

describe('round gauge', () => {
  it('maps the value linearly onto the sweep', () => {
    expect(angleAt(10, 10, 30)).toBe(SWEEP_START);
    expect(angleAt(20, 10, 30)).toBe((SWEEP_START + SWEEP_END) / 2);
    expect(angleAt(30, 10, 30)).toBe(SWEEP_END);
    expect(angleAt(15, 10, 30)).toBe(SWEEP_START + 0.25 * (SWEEP_END - SWEEP_START));
  });

  it('turns the needle by that angle', () => {
    const { container } = draw(gauge, 25, range);
    expect(needleRotation(container)).toBe(angleAt(25, 10, 30));
  });

  it('clamps the needle at both ends', () => {
    const below = draw(gauge, -500, range);
    expect(needleRotation(below.container)).toBe(SWEEP_START);
    cleanup();
    const above = draw(gauge, 500, range);
    expect(needleRotation(above.container)).toBe(SWEEP_END);
  });

  it('draws evenly spaced ticks for a tick count', () => {
    const { container } = draw(gauge, 10, { ...range, ticks: 4 });
    expect(container.querySelectorAll('[data-tick]')).toHaveLength(5);
    const numerals = [...container.querySelectorAll('[data-tick-label]')].map(
      (node) => node.textContent,
    );
    expect(numerals).toEqual(['10', '15', '20', '25', '30']);
  });

  it('draws ticks at listed values', () => {
    const { container } = draw(gauge, 10, { ...range, ticks: [10, 12, 30] });
    const numerals = [...container.querySelectorAll('[data-tick-label]')].map(
      (node) => node.textContent,
    );
    expect(numerals).toEqual(['10', '12', '30']);
  });

  it('draws each arc in its panel colour token', () => {
    const { container } = draw(gauge, 10, {
      ...range,
      arcs: [
        { from: 10, to: 20, colour: 'green' },
        { from: 20, to: 25, colour: 'yellow' },
        { from: 25, to: 30, colour: 'red' },
        { from: 12, to: 14, colour: 'white' },
      ],
    });
    const strokes = [...container.querySelectorAll('[data-arc]')].map(
      (node) => (node as SVGElement).style.stroke,
    );
    expect(strokes).toEqual([
      'var(--panel-arc-green)',
      'var(--panel-arc-yellow)',
      'var(--panel-arc-red)',
      'var(--panel-arc-white)',
    ]);
  });

  it('draws an arc over its own part of the sweep only', () => {
    const wide = draw(gauge, 10, { ...range, arcs: [{ from: 10, to: 30, colour: 'green' }] });
    const wideLength = wide.container.querySelector('[data-arc]')?.getAttribute('d');
    cleanup();
    const narrow = draw(gauge, 10, { ...range, arcs: [{ from: 10, to: 15, colour: 'green' }] });
    const narrowPath = narrow.container.querySelector('[data-arc]')?.getAttribute('d');
    expect(narrowPath).not.toBe(wideLength);
    expect(wideLength).toMatch(/ 0 1 1 /);
    expect(narrowPath).toMatch(/ 0 0 1 /);
  });

  it('sets the large-arc flag only for an arc wider than half a turn', () => {
    const half = draw(gauge, 10, { ...range, arcs: [{ from: 10, to: 20, colour: 'green' }] });
    expect(half.container.querySelector('[data-arc]')?.getAttribute('d')).toMatch(/ 0 0 1 /);
    cleanup();
    const most = draw(gauge, 10, { ...range, arcs: [{ from: 10, to: 28, colour: 'green' }] });
    expect(most.container.querySelector('[data-arc]')?.getAttribute('d')).toMatch(/ 0 1 1 /);
  });

  it('draws the needle in the needle token', () => {
    const { container } = draw(gauge, 20, range);
    const needle = container.querySelector('[data-needle] line') as SVGElement;
    expect(needle.style.stroke).toBe('var(--panel-needle)');
  });

  it('shows units and label', () => {
    const { container } = draw(gauge, 10, { ...range, units: 'psi' });
    expect(container.querySelector('[data-units]')?.textContent).toBe('psi');
    expect(container.querySelector('[data-label]')?.textContent).toBe('L');
  });

  it('draws on a default range when no options are given', () => {
    const { container } = draw(gauge, 50);
    expect(needleRotation(container)).toBe(0);
    expect(container.querySelector('[data-placeholder]')).toBeNull();
  });

  it('takes all its colours from panel tokens', () => {
    const { container } = draw(gauge, 20, {
      ...range,
      arcs: [{ from: 10, to: 30, colour: 'red' }],
    });
    const paints = [...container.querySelectorAll<SVGElement>('*')].flatMap((node) => [
      node.style.fill,
      node.style.stroke,
    ]);
    const used = paints.filter((paint) => paint !== '' && paint !== 'none');
    expect(used.length).toBeGreaterThan(0);
    for (const paint of used) expect(paint).toMatch(/^var\(--panel-[a-z-]+\)$/);
  });
});

describe('annunciator', () => {
  const lit = (container: HTMLElement) =>
    container.querySelector('[data-widget]')?.getAttribute('data-lit');
  const lampFill = (container: HTMLElement) =>
    (container.querySelector('[data-lamp]') as SVGElement).style.fill;

  it('is lit in the lamp colour for true', () => {
    const { container } = draw(annunciator, true, { lamp: 'red' });
    expect(lit(container)).toBe('true');
    expect(lampFill(container)).toBe('var(--panel-lamp-red)');
  });

  it('is dark for false', () => {
    const { container } = draw(annunciator, false, { lamp: 'red' });
    expect(lit(container)).toBe('false');
    expect(lampFill(container)).toBe('var(--panel-lamp-off)');
  });

  it.each(['amber', 'red', 'green', 'blue', 'white'])('maps lamp %s to its token', (lamp) => {
    const { container } = draw(annunciator, true, { lamp });
    expect(lampFill(container)).toBe(`var(--panel-lamp-${lamp})`);
    cleanup();
  });

  it('defaults to amber', () => {
    const { container } = draw(annunciator, true);
    expect(lampFill(container)).toBe('var(--panel-lamp-amber)');
  });

  it('shows its label', () => {
    const { container } = draw(annunciator, true);
    expect(container.querySelector('[data-label]')?.textContent).toBe('L');
  });
});

describe('digital readout', () => {
  const text = (container: HTMLElement) => container.querySelector('[data-value]');

  it('shows a string in the mono panel face', () => {
    const { container } = draw(readout, 'KHWD');
    expect(text(container)?.textContent).toBe('KHWD');
    expect((text(container) as SVGElement).style.fontFamily).toBe('var(--font-mono)');
  });

  it('shows a number, rounded to the declared decimals', () => {
    const { container } = draw(readout, 3.14159, { decimals: 2 });
    expect(text(container)?.textContent).toBe('3.14');
  });

  it('shows units beside the value', () => {
    const { container } = draw(readout, 7, { units: 'V' });
    expect(container.querySelector('[data-units]')?.textContent).toBe('V');
  });
});

describe('every indicator', () => {
  const cases: [string, IndicatorWidget, IndicatorValue, JsonObject | undefined][] = [
    ['round-gauge', gauge, 17, { ...range, arcs: [{ from: 10, to: 20, colour: 'green' }] }],
    ['annunciator', annunciator, true, { lamp: 'blue' }],
    ['digital-readout', readout, 'ABC', { units: 'x' }],
  ];

  it.each(cases)('%s renders the same output for the same props', (_id, Widget, value, options) => {
    const first = draw(Widget, value, options).container.innerHTML;
    cleanup();
    const second = draw(Widget, value, options).container.innerHTML;
    expect(second).toBe(first);
  });

  it.each(cases)('%s keeps no state between renders', (_id, Widget, value, options) => {
    const view = draw(Widget, value, options);
    const before = view.container.innerHTML;
    const other = typeof value === 'number' ? value + 1 : typeof value === 'boolean' ? !value : 'Z';
    view.rerender(<Widget value={other} label="L" {...(options ? { options } : {})} />);
    expect(view.container.innerHTML).not.toBe(before);
    view.rerender(<Widget value={value} label="L" {...(options ? { options } : {})} />);
    expect(view.container.innerHTML).toBe(before);
  });

  it.each(cases)('%s fills its placement and labels itself', (_id, Widget, value, options) => {
    const { container } = draw(Widget, value, options);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('100%');
    expect(svg?.getAttribute('height')).toBe('100%');
    expect(svg?.getAttribute('viewBox')).toBeTruthy();
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toContain('L');
  });
});

describe('invalid options', () => {
  const bad: [string, IndicatorWidget, IndicatorValue, JsonObject][] = [
    ['min equal to max', gauge, 5, { min: 5, max: 5 }],
    ['min above max', gauge, 5, { min: 9, max: 5 }],
    ['non-numeric range', gauge, 5, { min: 'a', max: 5 }],
    ['units that are not text', gauge, 5, { units: 3 }],
    ['an arc with from at or above to', gauge, 5, { arcs: [{ from: 5, to: 5, colour: 'red' }] }],
    ['an unknown arc colour', gauge, 5, { arcs: [{ from: 1, to: 5, colour: 'pink' }] }],
    ['arcs that are not a list', gauge, 5, { arcs: 'red' }],
    ['a tick outside the range', gauge, 5, { ticks: [500] }],
    ['a zero tick count', gauge, 5, { ticks: 0 }],
    ['an unknown lamp colour', annunciator, true, { lamp: 'pink' }],
    ['a negative decimal count', readout, 5, { decimals: -1 }],
  ];

  it.each(bad)('%s renders the placeholder without throwing', (_why, Widget, value, options) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { container } = draw(Widget, value, options);
    expect(container.querySelector('[data-placeholder]')).not.toBeNull();
    expect(container.querySelector('[data-label]')?.textContent).toBe('L');
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('renders the placeholder for a value of the wrong kind', () => {
    expect(draw(gauge, 'text').container.querySelector('[data-placeholder]')).not.toBeNull();
    cleanup();
    expect(draw(gauge, Number.NaN).container.querySelector('[data-placeholder]')).not.toBeNull();
    cleanup();
    expect(draw(annunciator, 3).container.querySelector('[data-placeholder]')).not.toBeNull();
  });
});

describe('defaults', () => {
  it('picks a round gauge for a number, an annunciator for a boolean, a readout for a string', () => {
    expect(defaultIndicatorWidget(1)).toBe(gauge);
    expect(defaultIndicatorWidget(true)).toBe(annunciator);
    expect(defaultIndicatorWidget('x')).toBe(readout);
  });

  it('exposes exactly the three generic ids', () => {
    expect(Object.keys(indicatorWidgets).sort()).toEqual([
      'annunciator',
      'digital-readout',
      'round-gauge',
    ]);
  });
});

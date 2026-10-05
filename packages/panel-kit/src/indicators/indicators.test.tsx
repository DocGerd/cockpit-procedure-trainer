// @vitest-environment jsdom
import type { IndicatorValue, JsonObject } from '@cpt/core';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DigitalReadout, UNITS_WIDTH } from './DigitalReadout';
import { angleAt, polar, squeeze, SWEEP_END, SWEEP_START } from './geometry';
import { defaultIndicatorWidget, indicatorWidgets } from './index';
import { MAX_DECIMALS, MAX_TICKS } from './options';
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

  it('clamps an arc to the range and drops an arc wholly outside it', () => {
    const wide = draw(gauge, 10, { ...range, arcs: [{ from: -100, to: 500, colour: 'green' }] });
    const clamped = wide.container.querySelector('[data-arc]')?.getAttribute('d');
    cleanup();
    const exact = draw(gauge, 10, { ...range, arcs: [{ from: 10, to: 30, colour: 'green' }] });
    expect(clamped).toBe(exact.container.querySelector('[data-arc]')?.getAttribute('d'));
    cleanup();
    const outside = draw(gauge, 10, { ...range, arcs: [{ from: 40, to: 50, colour: 'green' }] });
    expect(outside.container.querySelectorAll('[data-arc]')).toHaveLength(0);
    cleanup();
    const below = draw(gauge, 10, { ...range, arcs: [{ from: -50, to: -10, colour: 'green' }] });
    expect(below.container.querySelectorAll('[data-arc]')).toHaveLength(0);
    expect(outside.container.querySelector('[data-placeholder]')).toBeNull();
  });

  it('accepts the most ticks allowed', () => {
    const count = draw(gauge, 10, { ...range, ticks: MAX_TICKS });
    expect(count.container.querySelectorAll('[data-tick]')).toHaveLength(MAX_TICKS + 1);
    cleanup();
    const list = draw(gauge, 10, {
      ...range,
      ticks: Array.from({ length: MAX_TICKS }, () => 15),
    });
    expect(list.container.querySelectorAll('[data-tick]')).toHaveLength(MAX_TICKS);
  });

  it('places the sweep start at the lower left and the middle at the top', () => {
    expect(polar(0, 10)).toEqual({ x: 50, y: 40 });
    expect(polar(90, 10)).toEqual({ x: 60, y: 50 });
    expect(polar(180, 10)).toEqual({ x: 50, y: 60 });
    const { container } = draw(gauge, 10, {
      ...range,
      ticks: [10, 20],
      arcs: [{ from: 10, to: 20, colour: 'green' }],
    });
    const [first, middle] = [...container.querySelectorAll('[data-tick]')];
    expect(Number(middle?.getAttribute('y1'))).toBeLessThan(50);
    expect(Number(middle?.getAttribute('x1'))).toBeCloseTo(50);
    expect(Number(first?.getAttribute('y1'))).toBeGreaterThan(50);
    expect(Number(first?.getAttribute('x1'))).toBeLessThan(50);
    expect(container.querySelector('[data-arc]')?.getAttribute('d')).toMatch(
      /^M 20\.302 79\.698 A 42 42 0 0 1 50 8 *$/,
    );
  });

  it('is a meter that reports its value, range and units', () => {
    const { container } = draw(gauge, 25, { ...range, units: 'psi' });
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('meter');
    expect(svg?.getAttribute('aria-label')).toBe('L');
    expect(svg?.getAttribute('aria-valuenow')).toBe('25');
    expect(svg?.getAttribute('aria-valuemin')).toBe('10');
    expect(svg?.getAttribute('aria-valuemax')).toBe('30');
    expect(svg?.getAttribute('aria-valuetext')).toBe('25 psi');
    cleanup();
    expect(
      draw(gauge, 25, range).container.querySelector('svg')?.getAttribute('aria-valuetext'),
    ).toBe('25');
  });

  it('squeezes a long label and leaves a short one alone', () => {
    const Gauge = gauge;
    const long = render(<Gauge label={'W'.repeat(40)} value={1} />);
    expect(long.container.querySelector('[data-label]')?.hasAttribute('textLength')).toBe(true);
    cleanup();
    expect(draw(gauge, 1).container.querySelector('[data-label]')?.hasAttribute('textLength')).toBe(
      false,
    );
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

  const ariaLabel = (container: HTMLElement) =>
    container.querySelector('svg')?.getAttribute('aria-label');
  const stateLabels = { lit: 'LIT', dark: 'DARK' };

  it('names its state for assistive technology when state labels are given', () => {
    expect(ariaLabel(draw(annunciator, true, { stateLabels }).container)).toBe('L: LIT');
    cleanup();
    expect(ariaLabel(draw(annunciator, false, { stateLabels }).container)).toBe('L: DARK');
  });

  it('is named by its label alone without state labels', () => {
    expect(ariaLabel(draw(annunciator, true).container)).toBe('L');
    cleanup();
    expect(ariaLabel(draw(annunciator, false).container)).toBe('L');
  });

  it('outlines the lamp when lit, so the state does not rest on colour alone', () => {
    const on = draw(annunciator, true).container.querySelector<SVGElement>('[data-lamp]');
    expect(on?.style.stroke).toBe('var(--panel-legend)');
    expect(Number(on?.getAttribute('stroke-width'))).toBeGreaterThan(0);
    cleanup();
    const off = draw(annunciator, false).container.querySelector<SVGElement>('[data-lamp]');
    expect(off?.style.stroke).toBe('none');
    expect(Number(off?.getAttribute('stroke-width'))).toBe(0);
  });

  it('squeezes a long label and leaves a short one alone', () => {
    const Lamp = annunciator;
    const long = render(<Lamp label={'W'.repeat(30)} value />);
    expect(long.container.querySelector('[data-label]')?.hasAttribute('textLength')).toBe(true);
    cleanup();
    expect(
      draw(annunciator, true).container.querySelector('[data-label]')?.hasAttribute('textLength'),
    ).toBe(false);
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

  it('shows units beside the value and names them for assistive technology', () => {
    const { container } = draw(readout, 7, { units: 'V' });
    expect(container.querySelector('[data-units]')?.textContent).toBe('V');
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('L: 7 V');
  });

  it('names the value without units for assistive technology', () => {
    const { container } = draw(readout, 7);
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('L: 7');
  });

  it('accepts the most decimals allowed', () => {
    const { container } = draw(readout, 1, { decimals: MAX_DECIMALS });
    expect(text(container)?.textContent).toBe('1.000000');
  });

  it('reserves room for the units only when there are units', () => {
    const bare = draw(readout, 7).container.querySelector('[data-value]');
    const bareX = Number(bare?.getAttribute('x'));
    cleanup();
    const withUnits = draw(readout, 7, { units: 'V' }).container.querySelector('[data-value]');
    expect(Number(withUnits?.getAttribute('x'))).toBe(bareX - UNITS_WIDTH);
  });

  it('squeezes a value that would not fit and leaves a short one alone', () => {
    const short = draw(readout, 'ABCDEF').container.querySelector('[data-value]');
    expect(short?.hasAttribute('textLength')).toBe(false);
    cleanup();
    const long = draw(readout, 'ABCDEFGHIJKLMNOP').container.querySelector('[data-value]');
    expect(long?.getAttribute('textLength')).toBe(String(94 - 6));
    cleanup();
    const crowded = draw(readout, 'ABCDEFGH', { units: 'V' }).container.querySelector(
      '[data-value]',
    );
    expect(crowded?.getAttribute('textLength')).toBe(String(94 - UNITS_WIDTH - 6));
  });

  it('squeezes a long label and leaves a short one alone', () => {
    const Readout = readout;
    const long = render(<Readout label={'W'.repeat(40)} value="x" />);
    expect(long.container.querySelector('[data-label]')?.hasAttribute('textLength')).toBe(true);
    cleanup();
    expect(
      draw(readout, 'x').container.querySelector('[data-label]')?.hasAttribute('textLength'),
    ).toBe(false);
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
    expect(['img', 'meter']).toContain(svg?.getAttribute('role'));
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
    ['a fractional decimal count', readout, 5, { decimals: 1.5 }],
    ['more decimals than allowed', readout, 5, { decimals: MAX_DECIMALS + 1 }],
    [
      'more tick values than allowed',
      gauge,
      5,
      { ticks: Array.from({ length: MAX_TICKS + 1 }, () => 5) },
    ],
    ['more ticks than allowed', gauge, 5, { ticks: MAX_TICKS + 1 }],
    ['state labels that are not an object', annunciator, true, { stateLabels: 'on' }],
    ['state labels missing the dark text', annunciator, true, { stateLabels: { lit: 'on' } }],
    ['state labels that are not text', annunciator, true, { stateLabels: { lit: 1, dark: 'off' } }],
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

describe('squeeze', () => {
  it('asks for a fixed length only when the text exceeds the capacity', () => {
    expect(squeeze('abcd', 4, 50)).toEqual({});
    expect(squeeze('abcde', 4, 50)).toEqual({ textLength: 50, lengthAdjust: 'spacingAndGlyphs' });
  });
});

describe('defaults', () => {
  it('registers the readout component under its id', () => {
    expect(readout).toBe(DigitalReadout);
  });

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

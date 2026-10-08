// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RotaryKnob, Toggle } from './index';
import { rotary, toggle2, widgetProps } from './test-support';

const SPACING = 30;
const WIDTH = 44;
const HEIGHT = 48;
const TOP = 10;

/** Neighbours split at the midline between their centres; written in percent of each box. */
const SPLIT = (SPACING + WIDTH) / 2;
const percentOfWidth = (x: number) => (x / WIDTH) * 100;

function polygonPoints(clip: string): [number, number][] {
  const inner = /^polygon\((.*)\)$/.exec(clip)?.[1] ?? '';
  return inner.split(',').map((point) => {
    const [x = '', y = ''] = point.trim().split(/\s+/);
    expect(x.endsWith('%') && y.endsWith('%')).toBe(true);
    return [Number.parseFloat(x), Number.parseFloat(y)];
  });
}

function expectPolygon(clip: string | undefined, expected: [number, number][]) {
  const points = polygonPoints(clip ?? '');
  expect(points).toHaveLength(expected.length);
  points.forEach(([x, y], index) => {
    expect(x).toBeCloseTo(expected[index]?.[0] ?? Number.NaN);
    expect(y).toBeCloseTo(expected[index]?.[1] ?? Number.NaN);
  });
}

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const siblings = [...(this.parentElement?.children ?? [])];
    const index = this.getAttribute('role') === 'radio' ? siblings.indexOf(this) : -1;
    const left = index < 0 ? 0 : index * SPACING;
    const width = index < 0 ? 0 : WIDTH;
    const height = index < 0 ? 0 : HEIGHT;
    return {
      x: left,
      y: TOP,
      left,
      top: TOP,
      width,
      height,
      right: left + width,
      bottom: TOP + height,
      toJSON: () => ({}),
    } as DOMRect;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe.each([
  ['toggle', Toggle, toggle2],
  ['rotary knob', RotaryKnob, rotary],
])('the %s position targets', (_, Widget, control) => {
  it('are clipped where they overlap so that no point answers to two positions', () => {
    render(<Widget {...widgetProps(control)} />);
    const radios = screen.getAllByRole('radio');
    const clips = radios.map((radio) => radio.style.clipPath);
    expect(radios.length).toBeGreaterThan(1);
    expect(clips.every((clip) => clip.startsWith('polygon('))).toBe(true);
  });

  it('cut the first and last targets at the midline to their neighbours', () => {
    render(<Widget {...widgetProps(control)} />);
    const radios = screen.getAllByRole('radio');
    const right = percentOfWidth(SPLIT);
    const left = percentOfWidth(SPLIT - SPACING);
    expectPolygon(radios[0]?.style.clipPath, [
      [0, 0],
      [right, 0],
      [right, 100],
      [0, 100],
    ]);
    expectPolygon(radios.at(-1)?.style.clipPath, [
      [left, 0],
      [100, 0],
      [100, 100],
      [left, 100],
    ]);
  });

  it('are clipped in percent of their own box, which a zoomed panel does not scale', () => {
    render(<Widget {...widgetProps(control)} />);
    const clips = screen.getAllByRole('radio').map((radio) => radio.style.clipPath);
    expect(clips.join(' ')).toContain('%');
    expect(clips.join(' ')).not.toContain('px');
  });
});

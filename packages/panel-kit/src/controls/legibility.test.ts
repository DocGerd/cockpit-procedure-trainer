import { describe, expect, it } from 'vitest';
import {
  CAPS_ADVANCE,
  MAX_SQUEEZE,
  fitDesign,
  placard,
  placeLegends,
  placeText,
  scaleOf,
} from './legibility';

const metricsAt = (px: number, viewBox = 100) => ({ scale: px / viewBox, minPx: 11 });
const SIZES = [48, 80, 128, 208] as const;

describe('scaleOf', () => {
  it('takes the smaller axis, as the rendered viewBox does', () => {
    expect(scaleOf({ width: 200, height: 50 }, { width: 100, height: 50 })).toBe(1);
  });

  it('is undefined for a box with no size', () => {
    expect(scaleOf({ width: 0, height: 10 }, { width: 100, height: 100 })).toBeUndefined();
  });
});

describe('placeText', () => {
  it('shows everything at design size while unmeasured', () => {
    expect(placeText(undefined, { design: 5, room: 1, chars: 40 })).toEqual({
      show: true,
      fontSize: 5,
    });
  });

  it('grows text that would render below the minimum', () => {
    const placed = placeText(metricsAt(80), { design: 5, room: 100, chars: 1 });
    expect(placed.fontSize * 0.8).toBeCloseTo(11);
    expect(placed.show).toBe(true);
  });

  it('keeps the design size once it is already large enough', () => {
    expect(placeText(metricsAt(208), { design: 6, room: 100, chars: 1 }).fontSize).toBe(6);
    expect(placeText(metricsAt(208), { design: 8, room: 100, chars: 1 }).fontSize).toBe(8);
  });

  it('drops text that does not fit its room at the minimum size', () => {
    const options = { design: 5, room: 30, chars: 6, advance: 0.6 };
    expect(placeText(metricsAt(128), options).show).toBe(false);
    expect(placeText(metricsAt(208), options).show).toBe(true);
  });

  it('allows a squeezable text to overrun its room by the squeeze limit only', () => {
    const base = { design: 10, room: 50, advance: 1 };
    const limit = Math.floor(base.room / MAX_SQUEEZE / 11);
    expect(placeText(metricsAt(100), { ...base, chars: limit, squeezable: true }).show).toBe(true);
    expect(placeText(metricsAt(100), { ...base, chars: limit + 2, squeezable: true }).show).toBe(
      false,
    );
    expect(placeText(metricsAt(100), { ...base, chars: limit, squeezable: false }).show).toBe(
      false,
    );
  });

  it('drops text taller than its line', () => {
    expect(placeText(metricsAt(48), { design: 5, room: 100, chars: 1, height: 20 }).show).toBe(
      false,
    );
  });

  it.each(SIZES)('never renders shown text under the minimum at %i px', (px) => {
    const placed = placeText(metricsAt(px), { design: 3, room: 100, chars: 3 });
    if (placed.show) expect(placed.fontSize * (px / 100)).toBeGreaterThanOrEqual(11 - 1e-9);
  });
});

describe('placeLegends', () => {
  const entries = [
    { text: placard('on'), room: 34 },
    { text: placard('off'), room: 34 },
  ];

  it('picks one font size for the whole set from the tightest room', () => {
    const { fontSize } = placeLegends(undefined, entries);
    expect(fontSize).toBe(Math.min(12, fitDesign(12, 34, 3, CAPS_ADVANCE)));
  });

  it('drops the whole set when one legend does not fit', () => {
    const wide = [...entries, { text: placard('startup'), room: 34 }];
    expect(placeLegends(metricsAt(128), wide).show).toBe(false);
    expect(placeLegends(metricsAt(128), entries).show).toBe(true);
  });

  it.each([
    [48, false],
    [80, true],
    [128, true],
    [208, true],
  ])('at %i px the short placard set shows: %s', (px, shown) => {
    expect(placeLegends(metricsAt(px), entries).show).toBe(shown);
  });
});

describe('placard', () => {
  it('upper-cases the position id', () => {
    expect(placard('both')).toBe('BOTH');
  });
});

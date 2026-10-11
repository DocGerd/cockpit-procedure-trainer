import { describe, expect, it } from 'vitest';
import {
  BOTTOM_KEYS,
  CAP_SIZE,
  KEYS,
  KNOB_SIZE,
  KNOBS,
  SCREWS,
  SCREW_SIZE,
  TOP_KEYS,
  WINDOW,
  onRim,
} from './geometry';

// Touch-target sizes depend on the tokens and the rendered layout: apps/web/e2e/atr833.spec.ts
// measures them in the browser. These checks need neither.

describe('the ATR833 face geometry', () => {
  it('prints I/O, SET and MEM on top and DW, ▲▼ and ► below, left to right', () => {
    expect(TOP_KEYS.map((key) => key.legend)).toEqual(['I/O', 'SET', 'MEM']);
    expect(BOTTOM_KEYS.map((key) => key.legend)).toEqual(['DW', '▲▼', '►']);
    for (const row of [TOP_KEYS, BOTTOM_KEYS]) {
      const xs = row.map((key) => key.cap.x);
      expect(xs).toEqual([...xs].sort((a, b) => a - b));
    }
    expect(BOTTOM_KEYS.map((key) => key.name)).toEqual([undefined, 'SWAP', 'CURSOR']);
  });

  it('prints every legend above its cap', () => {
    for (const key of KEYS) expect(key.legendY).toBeLessThan(key.cap.y);
  });

  it('keeps the caps apart, inside the disc square and off the display window', () => {
    for (const [index, { cap, legend }] of KEYS.entries()) {
      expect(cap.x - CAP_SIZE / 2, legend).toBeGreaterThanOrEqual(0);
      expect(cap.x + CAP_SIZE / 2, legend).toBeLessThanOrEqual(1);
      expect(cap.y + CAP_SIZE / 2, legend).toBeLessThanOrEqual(1);
      const offWindow = cap.y + CAP_SIZE / 2 <= WINDOW.top || cap.y - CAP_SIZE / 2 >= WINDOW.bottom;
      expect(offWindow, legend).toBe(true);
      for (const other of KEYS.slice(index + 1)) {
        const apart = Math.hypot(cap.x - other.cap.x, cap.y - other.cap.y);
        expect(apart, `${legend} / ${other.legend}`).toBeGreaterThan(CAP_SIZE);
      }
    }
  });

  it('puts the knobs in the right-hand corners, inside the square', () => {
    expect(KNOBS.map((knob) => [knob.control, knob.word])).toEqual([
      ['volSel', 'VOL/SEL'],
      ['freq', 'FREQ'],
    ]);
    for (const { centre } of KNOBS) {
      expect(centre.x + KNOB_SIZE / 2).toBeLessThanOrEqual(1);
      expect(centre.y - KNOB_SIZE / 2).toBeGreaterThanOrEqual(0);
      expect(centre.y + KNOB_SIZE / 2).toBeLessThanOrEqual(1);
      expect(Math.hypot(centre.x - 0.5, centre.y - 0.5)).toBeGreaterThan(0.5 + KNOB_SIZE / 2);
    }
  });

  it('puts the screws at the left-hand corners only, inside the square', () => {
    for (const screw of SCREWS) {
      expect(screw.x).toBeLessThan(0.5);
      expect(screw.y + SCREW_SIZE / 2).toBeLessThanOrEqual(1);
    }
  });

  it('places a rim bearing clockwise from straight up', () => {
    const up = onRim(0, 0.5);
    const right = onRim(90, 0.5);
    expect(up.x).toBeCloseTo(0.5);
    expect(up.y).toBeCloseTo(0);
    expect(right.x).toBeCloseTo(1);
    expect(right.y).toBeCloseTo(0.5);
  });
});

// @ts-expect-error the device package declares no node types
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BOTTOM_KEYS,
  CAP_SIZE,
  DOCK_DIAMETER,
  HELPER_COLUMN,
  HELPER_GAP,
  KEYS,
  KNOB_SIZE,
  KNOBS,
  MIRROR_DIAMETER,
  SCREWS,
  SCREW_SIZE,
  TOP_KEYS,
  WINDOW,
  onRim,
} from './geometry';

const tokens: string = readFileSync(
  new URL('../../../../apps/web/src/styles/tokens.css', import.meta.url),
  'utf8',
);
const token = (name: string): number =>
  Number(new RegExp(`--${name}:\\s*(\\d+)px`).exec(tokens)?.[1]);

/** A token length such as `calc(var(--space-12) * 5 + var(--space-10))`, in px. */
function px(length: string): number {
  const sum = /^calc\(var\(--([\w-]+)\) \* (\d+) \+ var\(--([\w-]+)\)\)$/.exec(length);
  if (sum) return token(sum[1] ?? '') * Number(sum[2]) + token(sum[3] ?? '');
  const plus = /^calc\(var\(--([\w-]+)\) \+ var\(--([\w-]+)\)\)$/.exec(length);
  if (plus) return token(plus[1] ?? '') + token(plus[2] ?? '');
  const one = /^var\(--([\w-]+)\)$/.exec(length);
  if (one) return token(one[1] ?? '');
  return Number.NaN;
}

const D = px(DOCK_DIAMETER);
const TARGET = token('size-target');
const LEADING = token('leading-sm');

type Box = { name: string; left: number; top: number; right: number; bottom: number };

/** The dock hit box `FaceKey` gives a key: legend top to cap bottom, at least a touch target. */
const hitBoxes: Box[] = KEYS.map(({ legend, name, legendAt, cap }) => {
  const width = Math.max(TARGET, CAP_SIZE * D);
  const top = legendAt.y * D - LEADING / 2;
  const height = Math.max(TARGET, (cap.y - legendAt.y + CAP_SIZE / 2) * D + LEADING / 2);
  return {
    name: name ?? legend,
    left: cap.x * D - width / 2,
    right: cap.x * D + width / 2,
    top,
    bottom: top + height,
  };
});

const overlap = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

describe('the ATR833 face geometry', () => {
  it('reads the dock and mirror diameters from the tokens', () => {
    expect(D).toBeGreaterThan(0);
    expect(px(MIRROR_DIAMETER)).toBeGreaterThan(0);
    expect(TARGET).toBeGreaterThan(0);
  });

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
    for (const key of KEYS) expect(key.legendAt.y).toBeLessThan(key.cap.y);
  });

  it('gives every key a dock hit box of a full touch target inside the disc square', () => {
    for (const box of hitBoxes) {
      expect(box.right - box.left, box.name).toBeGreaterThanOrEqual(TARGET);
      expect(box.bottom - box.top, box.name).toBeGreaterThanOrEqual(TARGET);
      expect(box.left, box.name).toBeGreaterThanOrEqual(0);
      expect(box.top, box.name).toBeGreaterThanOrEqual(0);
      expect(box.right, box.name).toBeLessThanOrEqual(D);
      expect(box.bottom, box.name).toBeLessThanOrEqual(D);
    }
  });

  it('keeps the hit boxes apart and clear of the display window', () => {
    const window: Box = {
      name: 'window',
      left: WINDOW.left * D,
      right: WINDOW.right * D,
      top: WINDOW.top * D,
      bottom: WINDOW.bottom * D,
    };
    for (const [index, box] of hitBoxes.entries()) {
      for (const other of hitBoxes.slice(index + 1)) {
        expect(overlap(box, other), `${box.name} / ${other.name}`).toBe(false);
      }
      expect(overlap(box, window), box.name).toBe(false);
    }
  });

  it('puts the knobs in the right-hand corners, inside the square, and the helpers beyond it', () => {
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
    expect(px(HELPER_GAP)).toBeGreaterThan(0);
    expect(px(HELPER_COLUMN)).toBeGreaterThanOrEqual(TARGET);
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

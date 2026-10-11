import { describe, expect, it } from 'vitest';
import { OVERLAY_ICONS, PAGE_ICONS, PAGES } from '../logic';
import {
  ARC_HALF_SPAN,
  BODY,
  BRAND_FOOTPRINT,
  CRADLE,
  FACE,
  KEYS,
  LABEL_AT,
  MENU_KEY,
  POWER_BUMP,
  POWER_HIT,
  RAIL,
  SCREEN,
  TARGET,
} from './geometry';
import type { Rect } from './geometry';

const EPSILON = 1e-9;
const right = (rect: Rect) => rect.x + rect.width;
const bottom = (rect: Rect) => rect.y + rect.height;
const overlaps = (a: Rect, b: Rect) =>
  a.x < right(b) - EPSILON &&
  b.x < right(a) - EPSILON &&
  a.y < bottom(b) - EPSILON &&
  b.y < bottom(a) - EPSILON;
const inside = (inner: Rect, outer: Rect) =>
  inner.x >= outer.x - EPSILON &&
  inner.y >= outer.y - EPSILON &&
  right(inner) <= right(outer) + EPSILON &&
  bottom(inner) <= bottom(outer) + EPSILON;
const faceBox: Rect = { x: 0, y: 0, ...FACE };

const keySets = [
  ...PAGES.map((page) => [page, PAGE_ICONS[page]] as const),
  ['overlay', OVERLAY_ICONS] as const,
];

describe('aera 500 face geometry', () => {
  it('holds the cradle at the photographed width to height and the screen at 16:9', () => {
    expect(CRADLE.width / CRADLE.height).toBeGreaterThanOrEqual(1.67);
    expect(CRADLE.width / CRADLE.height).toBeLessThanOrEqual(1.7);
    expect(SCREEN.width / SCREEN.height).toBeCloseTo(16 / 9, 1);
  });

  it('keeps the rail and the POWER bump on the top edge and the slot label off the brand area', () => {
    for (const part of [RAIL, POWER_BUMP]) {
      expect(part.y).toBeLessThan(CRADLE.y);
      expect(bottom(part)).toBeGreaterThan(CRADLE.y);
    }
    const label = { x: LABEL_AT.x, y: LABEL_AT.y, width: 0, height: 0 };
    expect(overlaps({ ...label, x: label.x - 1, width: 2 }, BRAND_FOOTPRINT)).toBe(false);
    expect(LABEL_AT.y).toBeGreaterThan(bottom(SCREEN));
    expect(LABEL_AT.y).toBeLessThan(bottom(BODY));
  });

  it('draws the Map soft keys at quarters of the screen height, Menu among them', () => {
    const drawn = [KEYS.zoomOut, KEYS.zoomIn, MENU_KEY, KEYS.home].map((key) => key.drawn);
    for (const [index, rect] of drawn.entries()) {
      expect(rect.height / SCREEN.height).toBeGreaterThan(0.2);
      expect(rect.height / SCREEN.height).toBeLessThan(0.26);
      expect(right(rect)).toBeCloseTo(right(SCREEN));
      const next = drawn[index + 1];
      if (next) expect(bottom(rect)).toBeLessThan(next.y);
    }
  });

  it('puts POWER on the top edge, clear of the screen, and every touch key in the screen', () => {
    expect(inside(POWER_HIT, faceBox)).toBe(true);
    expect(overlaps(POWER_HIT, SCREEN)).toBe(false);
    expect(overlaps(POWER_HIT, POWER_BUMP)).toBe(true);
    for (const [icon, key] of Object.entries(KEYS)) {
      expect(inside(key.drawn, SCREEN), icon).toBe(true);
      expect(inside(key.label, key.drawn), icon).toBe(true);
      expect(inside(key.drawn, key.hit), icon).toBe(true);
      expect(inside(key.hit, BODY), icon).toBe(true);
    }
  });

  it.each(keySets)('gives every key of %s a full target that overlaps no other', (_, icons) => {
    const boxes = [POWER_HIT, ...icons.map((icon) => KEYS[icon].hit)];
    for (const box of boxes) {
      expect(box.width).toBeGreaterThanOrEqual(TARGET - EPSILON);
      expect(box.height).toBeGreaterThanOrEqual(TARGET - EPSILON);
      expect(inside(box, faceBox)).toBe(true);
    }
    for (const [index, box] of boxes.entries()) {
      for (const other of boxes.slice(index + 1)) expect(overlaps(box, other)).toBe(false);
    }
  });

  it('ends the range arc about half way down the screen', () => {
    expect(ARC_HALF_SPAN).toBeGreaterThan(Math.PI / 4);
    expect(ARC_HALF_SPAN).toBeLessThan(Math.PI / 2);
  });
});

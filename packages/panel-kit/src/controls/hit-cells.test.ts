import { describe, expect, it } from 'vitest';
import { hitCells } from './geometry';
import type { Cell, Rect } from './geometry';

const square = (cx: number, cy: number, side = 44): Rect => ({
  left: cx - side / 2,
  top: cy - side / 2,
  width: side,
  height: side,
});

const centre = (rect: Rect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

function contains(cell: Cell, point: { x: number; y: number }): boolean {
  let inside = false;
  for (let i = 0, j = cell.length - 1; i < cell.length; j = i, i += 1) {
    const a = cell[i];
    const b = cell[j];
    if (a === undefined || b === undefined) continue;
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

describe('hitCells', () => {
  it('leaves targets that touch nothing unclipped', () => {
    expect(hitCells([square(20, 20), square(100, 20)])).toEqual([undefined, undefined]);
  });

  it('gives each of three overlapping targets only the points nearest its own centre', () => {
    const rects = [square(18, 69), square(50, 87), square(82, 69)];
    const cells = hitCells(rects);
    rects.forEach((rect, index) => {
      const cell = cells[index];
      expect(cell).toBeDefined();
      if (cell === undefined) return;
      expect(contains(cell, centre(rect))).toBe(true);
      rects.forEach((other, otherIndex) => {
        if (otherIndex !== index) expect(contains(cell, centre(other))).toBe(false);
      });
    });
  });

  it('splits two stacked overlapping targets at the midline', () => {
    const [upper, lower] = hitCells([square(50, 20), square(50, 40)]);
    const ys = (cell: Cell | undefined) => (cell ?? []).map(({ y }) => y);
    expect(Math.max(...ys(upper))).toBeCloseTo(30);
    expect(Math.min(...ys(lower))).toBeCloseTo(30);
  });

  it('ignores targets with no size or the same centre', () => {
    expect(hitCells([square(10, 10, 0), square(10, 10, 0)])).toEqual([undefined, undefined]);
    expect(hitCells([square(10, 10), square(10, 10)])).toEqual([undefined, undefined]);
  });
});

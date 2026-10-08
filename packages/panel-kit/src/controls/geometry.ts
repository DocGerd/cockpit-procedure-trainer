export type Box = { x: number; y: number; w: number; h: number };

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const along = (index: number, count: number) => (count > 1 ? index / (count - 1) : 0.5);

export function verticalBoxes(ys: readonly number[], lo = 0, hi = 100): Box[] {
  const order = ys.map((_, index) => index).sort((a, b) => (ys[a] ?? 0) - (ys[b] ?? 0));
  const boxes: Box[] = ys.map(() => ({ x: 50, y: 50, w: 100, h: 100 }));
  order.forEach((index, rank) => {
    const y = ys[index] ?? 0;
    const above = order[rank - 1];
    const below = order[rank + 1];
    const top = above === undefined ? lo : (y + (ys[above] ?? 0)) / 2;
    const bottom = below === undefined ? hi : (y + (ys[below] ?? 0)) / 2;
    boxes[index] = { x: 50, y: (top + bottom) / 2, w: 100, h: bottom - top };
  });
  return boxes;
}

export function detentAngles(count: number): number[] {
  const span = Math.min(240, 60 * (count - 1));
  return Array.from({ length: count }, (_, index) => -span / 2 + along(index, count) * span);
}

export function polar(angle: number, radius: number): { x: number; y: number } {
  const radians = (angle * Math.PI) / 180;
  return { x: radius * Math.sin(radians), y: -radius * Math.cos(radians) };
}

export function minGap(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  let gap = Infinity;
  for (let index = 1; index < sorted.length; index += 1) {
    gap = Math.min(gap, (sorted[index] ?? 0) - (sorted[index - 1] ?? 0));
  }
  return gap;
}

export type Rect = { left: number; top: number; width: number; height: number };
type Point = { x: number; y: number };
export type Cell = readonly Point[];

const overlaps = (a: Rect, b: Rect) =>
  Math.min(a.left + a.width, b.left + b.width) > Math.max(a.left, b.left) &&
  Math.min(a.top + a.height, b.top + b.height) > Math.max(a.top, b.top);

/** The part of `polygon` at least as near `own` as `far`. */
function nearer(polygon: readonly Point[], own: Point, far: Point): Point[] {
  const middle = { x: (own.x + far.x) / 2, y: (own.y + far.y) / 2 };
  const side = (point: Point) =>
    (point.x - middle.x) * (own.x - far.x) + (point.y - middle.y) * (own.y - far.y);
  const kept: Point[] = [];
  polygon.forEach((a, index) => {
    const b = polygon[(index + 1) % polygon.length];
    if (b === undefined) return;
    const sa = side(a);
    const sb = side(b);
    if (sa >= 0) kept.push(a);
    if (sa >= 0 !== sb >= 0) {
      const t = sa / (sa - sb);
      kept.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
    }
  });
  return kept;
}

/**
 * Touch targets that overlap each own only the points nearer their centre than a neighbour's, so
 * a tap on a position's centre reaches that position. Undefined: nothing to cut.
 */
export function hitCells(rects: readonly Rect[]): (Cell | undefined)[] {
  const centres = rects.map(({ left, top, width, height }) => ({
    x: left + width / 2,
    y: top + height / 2,
  }));
  return rects.map((rect, index) => {
    const own = centres[index];
    if (own === undefined || rect.width <= 0 || rect.height <= 0) return undefined;
    const { left, top, width, height } = rect;
    let cell: Point[] = [
      { x: left, y: top },
      { x: left + width, y: top },
      { x: left + width, y: top + height },
      { x: left, y: top + height },
    ];
    let cutAny = false;
    rects.forEach((other, otherIndex) => {
      const far = centres[otherIndex];
      if (far === undefined || otherIndex === index || !overlaps(rect, other)) return;
      if (far.x === own.x && far.y === own.y) return;
      cutAny = true;
      cell = nearer(cell, own, far);
    });
    return cutAny ? cell : undefined;
  });
}

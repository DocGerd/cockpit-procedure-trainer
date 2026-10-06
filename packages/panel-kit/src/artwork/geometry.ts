import type { MovingPart, Point } from '@cpt/core';

type Needle = Extract<MovingPart, { type: 'needle' }>;
type Segment = { from: Point; to: Point; length: number };

export type LayerValue = number | boolean | string;

const clamp01 = (fraction: number) =>
  Number.isNaN(fraction) ? 0 : Math.min(1, Math.max(0, fraction));

const segmentsOf = (path: readonly Point[]): Segment[] =>
  path.slice(1).map((to, index) => {
    const from = path[index] ?? to;
    return { from, to, length: Math.hypot(to.x - from.x, to.y - from.y) };
  });

const lengthOf = (segments: readonly Segment[]) =>
  segments.reduce((sum, segment) => sum + segment.length, 0);

export function layerFraction(value: LayerValue, notches?: readonly string[]): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  const index = notches?.indexOf(value) ?? -1;
  if (!notches || index < 0 || notches.length < 2) return Number.NaN;
  return index / (notches.length - 1);
}

export function needleAngle(part: Needle, value: number): number {
  const { valueRange, angleRange } = part;
  const span = valueRange.max - valueRange.min;
  const fraction = span === 0 ? 0 : clamp01((value - valueRange.min) / span);
  return angleRange.min + fraction * (angleRange.max - angleRange.min);
}

export function pointAlong(path: readonly Point[], fraction: number): Point {
  const first = path[0] ?? { x: 0, y: 0 };
  const segments = segmentsOf(path);
  const total = lengthOf(segments);
  if (total === 0) return first;
  let remaining = clamp01(fraction) * total;
  for (const { from, to, length } of segments) {
    if (remaining <= length) {
      const along = length === 0 ? 0 : remaining / length;
      return { x: from.x + (to.x - from.x) * along, y: from.y + (to.y - from.y) * along };
    }
    remaining -= length;
  }
  return path[path.length - 1] ?? first;
}

export function fractionNear(path: readonly Point[], target: Point): number {
  const segments = segmentsOf(path);
  const total = lengthOf(segments);
  if (total === 0) return 0;
  let best = { distance: Number.POSITIVE_INFINITY, along: 0 };
  let before = 0;
  for (const { from, to, length } of segments) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const t =
      length === 0
        ? 0
        : clamp01(((target.x - from.x) * dx + (target.y - from.y) * dy) / length ** 2);
    const distance = Math.hypot(target.x - (from.x + dx * t), target.y - (from.y + dy * t));
    if (distance < best.distance) best = { distance, along: before + t * length };
    before += length;
  }
  return best.along / total;
}

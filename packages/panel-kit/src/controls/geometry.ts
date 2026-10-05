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

export const VIEWBOX = 100;
export const CENTRE = VIEWBOX / 2;
export const SWEEP_START = -135;
export const SWEEP_END = 135;
export const ARC_RADIUS = 42;
export const ARC_STROKE = 3;

export function fraction(value: number, min: number, max: number): number {
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

export function angleAt(value: number, min: number, max: number): number {
  return SWEEP_START + fraction(value, min, max) * (SWEEP_END - SWEEP_START);
}

export type Point = { readonly x: number; readonly y: number };

export function polar(angle: number, radius: number): Point {
  const radians = (angle * Math.PI) / 180;
  return {
    x: CENTRE + radius * Math.sin(radians),
    y: CENTRE - radius * Math.cos(radians),
  };
}

/** Width, centred on the dial, of a text band that stays clear of the arcs ending at the sweep end. */
export function arcEndRoom(top: number, bottom: number, gap: number): number {
  const inner = ARC_RADIUS - ARC_STROKE / 2;
  const end = polar(SWEEP_END, inner);
  const outerEnd = polar(SWEEP_END, ARC_RADIUS + ARC_STROKE / 2);
  if (top >= outerEnd.y) return Infinity;
  const drop = Math.min(bottom, end.y) - CENTRE;
  return 2 * (Math.sqrt(inner ** 2 - drop ** 2) - gap);
}

export function formatNumber(value: number): string {
  return String(Number(value.toFixed(2)));
}

export function squeeze(
  text: string,
  capacity: number,
  width: number,
): { textLength: number; lengthAdjust: 'spacingAndGlyphs' } | Record<string, never> {
  return text.length > capacity ? { textLength: width, lengthAdjust: 'spacingAndGlyphs' } : {};
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export function arcPath(fromAngle: number, toAngle: number, radius: number): string {
  const start = polar(fromAngle, radius);
  const end = polar(toAngle, radius);
  const large = toAngle - fromAngle > 180 ? 1 : 0;
  return `M ${round(start.x)} ${round(start.y)} A ${radius} ${radius} 0 ${large} 1 ${round(end.x)} ${round(end.y)}`;
}

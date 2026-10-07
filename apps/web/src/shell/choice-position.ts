export type Placement = 'start' | 'end' | 'header';

interface Span {
  left: number;
  right: number;
}

export function choosePlacement(
  chip: Span,
  width: number,
  viewport: number,
  margin: number,
): Placement {
  if (chip.left >= margin && chip.left + width <= viewport - margin) return 'start';
  if (chip.right - width >= margin && chip.right <= viewport - margin) return 'end';
  return 'header';
}

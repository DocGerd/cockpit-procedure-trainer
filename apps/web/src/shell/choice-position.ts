export type Placement = 'start' | 'end' | 'header';

interface Span {
  left: number;
  right: number;
}

const TOLERANCE = 0.5;

// Left and right are physical: the shipped languages are all left-to-right.
export function choosePlacement(
  chip: Span,
  width: number,
  viewport: number,
  margin: number,
): Placement {
  const min = margin - TOLERANCE;
  const max = viewport - margin + TOLERANCE;
  if (chip.left >= min && chip.left + width <= max) return 'start';
  if (chip.right - width >= min && chip.right <= max) return 'end';
  return 'header';
}

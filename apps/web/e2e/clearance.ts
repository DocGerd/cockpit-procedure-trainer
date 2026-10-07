export type Box = { left: number; right: number; top: number; bottom: number };
type Point = { x: number; y: number };
type Matrix = { a: number; b: number; c: number; d: number; e: number; f: number };

/** An SVG shape as the browser reports it: its local bounding box and its local-to-screen matrix. */
export type Shape = {
  tag: string;
  box: { x: number; y: number; width: number; height: number };
  matrix: Matrix;
};

// The label sits this far into a moving part before it counts as overlapping.
const CLEARANCE_PX = 1;

const SINGULAR_EPSILON = 1e-9;

const apply = (m: Matrix, { x, y }: Point): Point => ({
  x: m.a * x + m.c * y + m.e,
  y: m.b * x + m.d * y + m.f,
});

const invert = (m: Matrix): Matrix | undefined => {
  const det = m.a * m.d - m.b * m.c;
  if (Math.abs(det) < SINGULAR_EPSILON) return undefined;
  return {
    a: m.d / det,
    b: -m.b / det,
    c: -m.c / det,
    d: m.a / det,
    e: (m.c * m.f - m.d * m.e) / det,
    f: (m.b * m.e - m.a * m.f) / det,
  };
};

const corners = (box: Box): Point[] => [
  { x: box.left, y: box.top },
  { x: box.right, y: box.top },
  { x: box.right, y: box.bottom },
  { x: box.left, y: box.bottom },
];

const outline = ({ box, matrix }: Shape): Point[] =>
  corners({
    left: box.x,
    right: box.x + box.width,
    top: box.y,
    bottom: box.y + box.height,
  }).map((point) => apply(matrix, point));

/** Separating-axis test of a turned rectangle, possibly flat, against an upright box. */
const quadHitsBox = (quad: readonly Point[], area: Box) => {
  const areaCorners = corners(area);
  const axes = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    ...quad.flatMap((from, index) => {
      const to = quad[(index + 1) % quad.length] ?? from;
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      return length === 0 ? [] : [{ x: (from.y - to.y) / length, y: (to.x - from.x) / length }];
    }),
  ];
  return axes.every((axis) => {
    const project = (points: readonly Point[]) => {
      const along = points.map(({ x, y }) => x * axis.x + y * axis.y);
      return { min: Math.min(...along), max: Math.max(...along) };
    };
    const part = project(quad);
    const other = project(areaCorners);
    return part.min < other.max && other.min < part.max;
  });
};

const distanceToSegment = (from: Point, to: Point) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = dx * dx + dy * dy;
  const along = length === 0 ? 0 : Math.min(Math.max(-(from.x * dx + from.y * dy) / length, 0), 1);
  return Math.hypot(from.x + along * dx, from.y + along * dy);
};

/** Whether the open unit disc around the origin meets the convex polygon. */
const unitDiscHitsConvex = (polygon: readonly Point[]) => {
  const edges = polygon.map((from, index) => ({
    from,
    to: polygon[(index + 1) % polygon.length] ?? from,
  }));
  const sides = edges.map(({ from, to }) => from.x * to.y - from.y * to.x);
  const inside = sides.every((side) => side >= 0) || sides.every((side) => side <= 0);
  return inside || edges.some(({ from, to }) => distanceToSegment(from, to) < 1);
};

/**
 * A circle or ellipse under any local-to-screen matrix, exactly: the clearance box goes into
 * the shape's own frame, scaled so the shape is the unit disc, where it stays a convex polygon.
 * Undefined when the shape is flat or the matrix cannot be inverted.
 */
const ellipseHitsBox = ({ box, matrix }: Shape, area: Box): boolean | undefined => {
  const back = invert(matrix);
  const rx = box.width / 2;
  const ry = box.height / 2;
  if (!back || rx <= 0 || ry <= 0) return undefined;
  const polygon = corners(area).map((corner) => {
    const local = apply(back, corner);
    return { x: (local.x - (box.x + rx)) / rx, y: (local.y - (box.y + ry)) / ry };
  });
  return unitDiscHitsConvex(polygon);
};

/**
 * Findings for one control: a moving part that cannot be measured, none at all, or a placard
 * that reaches into one. Parts are measured as they are drawn (turned, scaled, skewed, round),
 * not by the upright box around them.
 */
export function clearanceProblems(
  where: string,
  label: Box,
  shapes: readonly Shape[],
  unmeasurable: readonly string[],
): string[] {
  const problems = unmeasurable.map((tag) => `${where} moving part <${tag}> cannot be measured`);
  if (shapes.length === 0 && unmeasurable.length === 0) {
    problems.push(`${where} has no measurable moving part`);
  }
  const area: Box = {
    left: label.left + CLEARANCE_PX,
    right: label.right - CLEARANCE_PX,
    top: label.top + CLEARANCE_PX,
    bottom: label.bottom - CLEARANCE_PX,
  };
  const hit = shapes.some((shape) => {
    const round = shape.tag === 'circle' || shape.tag === 'ellipse';
    const exact = round ? ellipseHitsBox(shape, area) : undefined;
    return exact ?? quadHitsBox(outline(shape), area);
  });
  if (hit) problems.push(`${where} placard overlaps a moving part`);
  return problems;
}

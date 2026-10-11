// The TRT800H face in fractions of its unit box, the bounding square of the disc, origin top
// left: intake §3.8.2, "Face layout (photos)".

export type Point = { x: number; y: number };

export const DISC = { centre: { x: 0.5, y: 0.5 }, radius: 0.5, rim: 0.01 };

export const KEY_CAP = 0.1;

export type FaceKeySpec = {
  control: string;
  legend: string;
  /** The accessible name where the legend is a glyph. */
  name?: string;
  legendAt: Point;
  cap: Point;
};

export const TOP_KEYS: readonly FaceKeySpec[] = [
  { control: 'power', legend: 'I/O', legendAt: { x: 0.375, y: 0.095 }, cap: { x: 0.37, y: 0.17 } },
  { control: 'vfr', legend: 'VFR', legendAt: { x: 0.535, y: 0.09 }, cap: { x: 0.535, y: 0.17 } },
  { control: 'ident', legend: 'ID', legendAt: { x: 0.686, y: 0.085 }, cap: { x: 0.69, y: 0.165 } },
];

export const BOTTOM_KEYS: readonly FaceKeySpec[] = [
  { control: 'mode', legend: 'MODE', legendAt: { x: 0.33, y: 0.77 }, cap: { x: 0.33, y: 0.85 } },
  {
    control: 'swap',
    legend: '▲▼',
    name: 'CHANGE',
    legendAt: { x: 0.495, y: 0.763 },
    cap: { x: 0.5, y: 0.85 },
  },
  {
    control: 'cursor',
    legend: '►',
    name: 'CURSOR',
    legendAt: { x: 0.657, y: 0.755 },
    cap: { x: 0.66, y: 0.845 },
  },
];

export const KEYS: readonly FaceKeySpec[] = [...TOP_KEYS, ...BOTTOM_KEYS];

/** Outside the disc at the lower right; a light end cap crossed by a dark pointer line. */
export const KNOB = { centre: { x: 0.91, y: 0.92 }, diameter: 0.15, endCap: 0.6, ribs: 20 };

export const SCREW_DIAMETER = 0.1;

export const SCREWS: readonly Point[] = [
  { x: 0.1, y: 0.11 },
  { x: 0.92, y: 0.08 },
  { x: 0.09, y: 0.94 },
];

/** `ATC`, three upright letters down the left of the display. */
export const LABEL = { x: 0.068, top: 0.43, bottom: 0.61 };

export const WINDOW = { left: 0.13, right: 0.84, top: 0.24, bottom: 0.63, radius: 0.02 };

/** The display lines: centre heights, and the column edges the values and words align to. */
export const LINES = {
  top: 0.33,
  middle: 0.475,
  bottom: 0.565,
  wordLeft: 0.18,
  valueRight: 0.695,
  levelRight: 0.64,
};

/** A unit-box fraction measured inside the display window instead. */
export const inWindow = (point: Point): Point => ({
  x: (point.x - WINDOW.left) / (WINDOW.right - WINDOW.left),
  y: (point.y - WINDOW.top) / (WINDOW.bottom - WINDOW.top),
});

/** A fraction as a CSS percentage, free of floating-point tails. */
export const percent = (fraction: number) => `${Number((fraction * 100).toFixed(4))}%`;

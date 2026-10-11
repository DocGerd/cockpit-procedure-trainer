// The ATR833's face as D-MPGO's photos show it: docs/aircraft/ctsl-intake.md section 3.8.1,
// "Face layout (photos)". Every position is a fraction of the disc's bounding square, origin at the
// top left; values outside 0 to 1 lie outside the square.

export type Point = { readonly x: number; readonly y: number };

/** The disc's diameter in the dock and in the slot mirror. */
export const DOCK_DIAMETER = 'calc(var(--space-12) * 5 + var(--space-10))';
export const MIRROR_DIAMETER = 'calc(var(--space-12) * 5 + var(--space-8))';

/** The column of knob helpers right of the unit, on the panel metal, and its gap to the knobs. */
export const HELPER_GAP = 'var(--space-2)';
export const HELPER_COLUMN = 'calc(var(--space-12) + var(--space-1))';

export const DISC = { centre: { x: 0.5, y: 0.5 }, radius: 0.5, rim: 0.01 } as const;

export type FaceKeySpec = {
  readonly legend: string;
  /** The accessible name where the legend is a glyph. */
  readonly name?: string;
  readonly control: string;
  readonly legendAt: Point;
  readonly cap: Point;
};

export const CAP_SIZE = 0.1;

export const TOP_KEYS: readonly FaceKeySpec[] = [
  { legend: 'I/O', control: 'power', legendAt: { x: 0.315, y: 0.09 }, cap: { x: 0.32, y: 0.165 } },
  { legend: 'SET', control: 'set', legendAt: { x: 0.486, y: 0.09 }, cap: { x: 0.49, y: 0.16 } },
  { legend: 'MEM', control: 'mem', legendAt: { x: 0.635, y: 0.085 }, cap: { x: 0.65, y: 0.155 } },
];

export const BOTTOM_KEYS: readonly FaceKeySpec[] = [
  { legend: 'DW', control: 'dw', legendAt: { x: 0.33, y: 0.765 }, cap: { x: 0.32, y: 0.85 } },
  {
    legend: '▲▼',
    name: 'SWAP',
    control: 'swap',
    legendAt: { x: 0.5, y: 0.765 },
    cap: { x: 0.5, y: 0.85 },
  },
  {
    legend: '►',
    name: 'CURSOR',
    control: 'cursor',
    legendAt: { x: 0.67, y: 0.76 },
    cap: { x: 0.67, y: 0.85 },
  },
];

export const KEYS: readonly FaceKeySpec[] = [...TOP_KEYS, ...BOTTOM_KEYS];

export type KnobSpec = {
  readonly control: 'volSel' | 'freq';
  /** The word its touch helpers print and are named by. */
  readonly word: string;
  readonly centre: Point;
};

export const KNOB_SIZE = 0.16;
/** Fine vertical ribs round the knurled cylinder, seen end-on. */
export const KNOB_RIBS = 20;
/** The flat black end, as a fraction of the knob's diameter. */
export const KNOB_END = 0.74;

export const KNOBS: readonly KnobSpec[] = [
  { control: 'volSel', word: 'VOL/SEL', centre: { x: 0.92, y: 0.09 } },
  { control: 'freq', word: 'FREQ', centre: { x: 0.92, y: 0.92 } },
];

export const SCREW_SIZE = 0.1;
export const SCREWS: readonly Point[] = [
  { x: 0.1, y: 0.12 },
  { x: 0.1, y: 0.95 },
];

/** The curved VOL/SEL legend round the rim: bearings clockwise from straight up, in degrees. */
export const VOL_SEL_ARC = { text: 'VOL/SEL', radius: 0.455, from: 28, to: 52 } as const;

/** The vertical COM: three upright letters stacked down the left of the display. */
export const COM_LABEL = { text: 'COM', x: 0.055, top: 0.44, bottom: 0.62 } as const;

export const WINDOW = { left: 0.14, right: 0.85, top: 0.24, bottom: 0.63, radius: 0.02 } as const;
/** The window's bevel: a lighter line along its bottom and a faint strip down its right edge. */
export const BEVEL = {
  bottom: { y: 0.62, left: 0.17, right: 0.8 },
  right: { left: 0.83, right: 0.86 },
} as const;

/** Where the display's three lines sit, in fractions of the disc. */
export const LINE_CENTRES = [0.335, 0.44, 0.555] as const;
export const LABEL_LEFT = 0.205;
export const VALUE_RIGHT = 0.8;
/** The line-3 value follows its label straight away. */
export const LINE3_VALUE_LEFT = 0.33;

/** A bearing on the disc, in degrees clockwise from straight up, as a point at `radius`. */
export function onRim(bearing: number, radius: number): Point {
  const rad = (bearing * Math.PI) / 180;
  return { x: DISC.centre.x + radius * Math.sin(rad), y: DISC.centre.y - radius * Math.cos(rad) };
}

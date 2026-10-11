import type { TouchIcon } from '../logic';

// The face of intake section 3.8.3, "Face layout (photos)", in natural pixels at the base token
// scale. The unit box is the outer cradle frame (ux, uy); the screen has its own frame (sx, sy).
// Every placement is a fraction of the face, so the dock and the mirror draw the same face.

export type Rect = { x: number; y: number; width: number; height: number };

/** The face's natural size, in CSS pixels at the base token scale. */
export const FACE = { width: 340, height: 234 } as const;

/** `--space-1` and `--size-target` at the base token scale; a tools contract test ties them. */
export const SPACE_1 = 4;
export const TARGET = 44;

/** FACE in tokens, so the face scales with them. */
export const FACE_SIZE_CSS = {
  width: `calc(var(--space-1) * ${FACE.width / SPACE_1})`,
  height: `calc(var(--space-1) * ${FACE.height / SPACE_1})`,
} as const;

// Above the cradle: room for the POWER word over its bump on the top edge, in face units.
const STRIP = 32;

export const CRADLE: Rect = { x: 0, y: STRIP, width: FACE.width, height: FACE.height - STRIP };

const ux = (fraction: number) => CRADLE.x + fraction * CRADLE.width;
const uy = (fraction: number) => CRADLE.y + fraction * CRADLE.height;
const unitRect = (x0: number, x1: number, y0: number, y1: number): Rect => ({
  x: ux(x0),
  y: uy(y0),
  width: ux(x1) - ux(x0),
  height: uy(y1) - uy(y0),
});

export const CRADLE_RADIUS = 0.09 * CRADLE.height;
export const BODY = unitRect(0.066, 0.945, 0.075, 0.925);
export const BODY_RADIUS = 0.05 * CRADLE.height;
export const RAIL = unitRect(0.33, 0.61, -0.03, 0.035);
export const POWER_BUMP = unitRect(0.81, 0.92, -0.025, 0.035);
export const SENSOR = { x: ux(0.92), y: uy(0.44), r: 0.006 * CRADLE.width };
export const SCREEN = unitRect(0.151, 0.838, 0.15, 0.799);
export const SCREEN_FRAME = 0.008 * CRADLE.width;
/** Kept blank: the maker's lettering is never reproduced. */
export const BRAND_FOOTPRINT = unitRect(0.11, 0.31, 0.89, 0.93);
/** The slot label's centre, in the body's bottom band (D21). */
export const LABEL_AT = { x: ux(0.5), y: uy(0.868) };

const bumpCentre = POWER_BUMP.x + POWER_BUMP.width / 2;
/** POWER's hit box: the printed word, the bump and the frame's top band, clear of the screen. */
export const POWER_HIT: Rect = { x: bumpCentre - TARGET / 2, y: 0, width: TARGET, height: TARGET };
export const POWER_WORD: Rect = {
  x: POWER_HIT.x,
  y: STRIP * 0.1,
  width: TARGET,
  height: POWER_BUMP.y - STRIP * 0.2,
};

const sx = (fraction: number) => SCREEN.x + fraction * SCREEN.width;
const sy = (fraction: number) => SCREEN.y + fraction * SCREEN.height;
export const screenRect = (x0: number, x1: number, y0: number, y1: number): Rect => ({
  x: sx(x0),
  y: sy(y0),
  width: sx(x1) - sx(x0),
  height: sy(y1) - sy(y0),
});

/** The map's chart, left of the soft-key column. */
export const CHART = screenRect(0, 0.83, 0, 1);

// Map page soft keys: four quarters of the right column, top to bottom Out, In, Menu, Home.
const COLUMN = [0.83, 1] as const;
const QUARTERS = [
  [0, 0.25],
  [0.26, 0.49],
  [0.51, 0.73],
  [0.75, 1],
] as const;
const quarter = (index: 0 | 1 | 2 | 3): Rect => {
  const [top, bottom] = QUARTERS[index];
  return screenRect(COLUMN[0], COLUMN[1], top, bottom);
};
const bottomOf = (rect: Rect) => rect.y + rect.height;

export type Pictogram = 'zoomOut' | 'zoomIn' | 'menu' | 'home' | 'back';

export type KeySpec = {
  /** The key as the screen draws it. */
  drawn: Rect;
  /** The touch target; it may reach into bezel or a drawn key nobody operates (D25). */
  hit: Rect;
  /** Where its name is printed. */
  label: Rect;
  pictogram?: Pictogram | undefined;
};

// A soft key prints its pictogram in the upper part and its name in the lower third.
const softKey = (drawn: Rect, hit: Rect, pictogram: Pictogram): KeySpec => ({
  drawn,
  hit,
  label: {
    x: drawn.x,
    y: drawn.y + drawn.height * 0.62,
    width: drawn.width,
    height: drawn.height * 0.36,
  },
  pictogram,
});

const plainKey = (drawn: Rect): KeySpec => ({ drawn, hit: drawn, label: drawn });

const columnWidth = Math.max(quarter(0).width, TARGET);
const firstHit: Rect = {
  x: quarter(0).x,
  y: bottomOf(quarter(0)) - TARGET,
  width: columnWidth,
  height: TARGET,
};
const secondHit: Rect = { ...firstHit, y: bottomOf(firstHit) };
const lastHit: Rect = { ...firstHit, y: quarter(3).y };

/** The drawn Menu key: page menus are not modelled, so it is art only. */
export const MENU_KEY = softKey(quarter(2), quarter(2), 'menu');

// Home grid: a title strip with the signal bars, then three columns of two rows.
export const HOME_STRIP = screenRect(0.03, 0.97, 0.02, 0.19);
const GRID_COLUMNS = [
  [0.02, 0.33],
  [0.345, 0.655],
  [0.67, 0.98],
] as const;
const GRID_ROWS = [
  [0.21, 0.585],
  [0.615, 0.99],
] as const;
const gridKey = (column: 0 | 1 | 2, row: 0 | 1): KeySpec => {
  const [x0, x1] = GRID_COLUMNS[column];
  const [y0, y1] = GRID_ROWS[row];
  return plainKey(screenRect(x0, x1, y0, y1));
};

export const KEYS: Readonly<Record<TouchIcon, KeySpec>> = {
  accept: plainKey(screenRect(0.2, 0.8, 0.6, 0.95)),
  back: softKey(quarter(0), firstHit, 'back'),
  home: softKey(quarter(3), lastHit, 'home'),
  zoomOut: softKey(quarter(0), firstHit, 'zoomOut'),
  zoomIn: softKey(quarter(1), secondHit, 'zoomIn'),
  map: gridKey(0, 0),
  nearest: gridKey(1, 0),
  activeFpl: gridKey(2, 0),
  directTo: gridKey(0, 1),
  position: gridKey(1, 1),
  tools: gridKey(2, 1),
  gpsStatus: plainKey(screenRect(0.1, 0.73, 0.55, 0.92)),
  dimmer: plainKey(screenRect(0.06, 0.28, 0.42, 0.86)),
  brighter: plainKey(screenRect(0.72, 0.94, 0.42, 0.86)),
};

/** The text area of a page beside the soft-key column. */
export const CONTENT = screenRect(0, COLUMN[0], 0, 1);

export type MapField = 'speed' | 'ete' | 'bearing' | 'dist';

/** A map field's label row (sy) and its outer edge (sx): the start edge, or the end for `end`. */
export type FieldSpec = { edge: number; row: readonly [number, number]; end: boolean };

/** The label rows of the four map fields as the photos place them; each value prints under it. */
export const MAP_FIELDS: Readonly<Record<MapField, FieldSpec>> = {
  speed: { edge: 0.1, row: [0.04, 0.07], end: false },
  ete: { edge: 0.82, row: [0.02, 0.07], end: true },
  bearing: { edge: 0.075, row: [0.83, 0.87], end: false },
  dist: { edge: 0.79, row: [0.82, 0.86], end: true },
};

// The map's overlays, in screen fractions: the four fields, the range arc around the own ship.
export const OWNSHIP = { x: sx(0.4), y: sy(0.87) };
export const ARC_RADIUS = OWNSHIP.y - sy(0.14);
/** The arc's half span: it ends at the height the photos show, sy 0.54. */
export const ARC_HALF_SPAN = Math.acos((OWNSHIP.y - sy(0.54)) / ARC_RADIUS);

const percent = (fraction: number) => `${Number((fraction * 100).toFixed(4))}%`;

/** A rect as CSS placement in percent of a box. */
export const placeIn = (rect: Rect, box: Rect = { x: 0, y: 0, ...FACE }) => ({
  left: percent((rect.x - box.x) / box.width),
  top: percent((rect.y - box.y) / box.height),
  width: percent(rect.width / box.width),
  height: percent(rect.height / box.height),
});

/** A point as CSS placement in percent of a box. */
export const pointIn = (point: { x: number; y: number }, box: Rect) => ({
  left: percent((point.x - box.x) / box.width),
  top: percent((point.y - box.y) / box.height),
});

/** The mirror box (8:5) holds the face at full height, centred. */
export const MIRROR_FACE_WIDTH = (FACE.width / FACE.height) * (5 / 8);

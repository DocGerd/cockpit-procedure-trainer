// The face as the "Face layout (photos)" block of intake §3.8.4 gives it: x is a fraction of the
// face width W, y and every size a fraction of its height H, origin at the top left.

/** W over H. */
export const FACE_ASPECT = 9 / 5;
export const CORNER_RADIUS = 0.08;
export const EDGE_WIDTH = 0.012;
export const LINE_WIDTH = 0.007;

/** The art's viewBox: one unit is a hundredth of H, so circles stay round. */
export const VIEW_H = 100;
export const VIEW_W = VIEW_H * FACE_ASPECT;
export const toViewX = (x: number) => x * VIEW_W;
export const toViewY = (y: number) => y * VIEW_H;

export const LED_DIAMETER = 0.055;
export const GLOW_DIAMETER = LED_DIAMETER * 1.6;

/** The plain unit word that stands in the wordmark's footprint (plan addendum D20). */
export const WORDMARK = { x: (0.06 + 0.27) / 2, y: (0.15 + 0.33) / 2 } as const;

export const STATUS_LED_X = 0.1;
export const STATUS_LABEL_X = 0.13;
export const STATUS_LEDS = [
  { id: 'rx', word: 'RX', y: 0.47 },
  { id: 'tx', word: 'TX', y: 0.59 },
  { id: 'gps', word: 'GPS', y: 0.705 },
  { id: 'power', word: 'Power', y: 0.82 },
] as const;

export const SIDE_LED_X = 0.5;
/** The side LEDs' words end here, left of the bar. */
export const SIDE_LABEL_END = 0.47;
export const ABOVE = { ledY: 0.165, labelY: 0.165 } as const;
export const BELOW = { ledY: 0.83, labelY: 0.835 } as const;
export const BAR = { x: 0.497, top: 0.2, bottom: 0.8 } as const;

export type Box = { left: number; right: number; top: number; bottom: number };
export const MODE_FRAME: Box = { left: 0.28, right: 0.47, top: 0.38, bottom: 0.75 };
export const MODE_CAP: Box = { left: 0.31, right: 0.44, top: 0.43, bottom: 0.7 };
export const MODE_CORNER = 0.03;
export const MODE_LEGEND = { x: 0.375, y: 0.57 } as const;

export const RING = { x: 0.734, y: 0.485, radius: 0.33 } as const;
/** Clockwise from the nose, in the order of the logic's ring LEDs. */
export const RING_BEARINGS = [18, 54, 90, 126, 162, 198, 234, 270, 306, 342] as const;
/** How far a spoke runs on past its LED's edge. */
export const SPOKE_TAIL = 0.05;

/** A ring LED's centre, x in fractions of W and y of H. */
export function ringLed(bearing: number): { x: number; y: number } {
  const radians = (bearing * Math.PI) / 180;
  return {
    x: RING.x + (RING.radius * Math.sin(radians)) / FACE_ASPECT,
    y: RING.y - RING.radius * Math.cos(radians),
  };
}

/** A straight-wing light aircraft seen from above; the fuselage width is a fraction of W. */
export const FUSELAGE = { x: 0.735, nose: 0.23, tail: 0.73, width: 0.045, tailWidth: 0.02 };
export const WING: Box = { left: 0.6, right: 0.87, top: 0.45, bottom: 0.53 };
export const TAILPLANE: Box = { left: 0.68, right: 0.79, top: 0.7, bottom: 0.75 };

/** The mirror's face is as wide as this share of the mirror box, centred; the mirror is 2:1. */
export const MIRROR_FACE_WIDTH = 0.9;
export const mirrorX = (x: number) => (1 - MIRROR_FACE_WIDTH) / 2 + x * MIRROR_FACE_WIDTH;

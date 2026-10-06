export type Runway = { readonly designator: string; readonly headingDeg: number };

/** Compass degrees run 1 to 360; north is 360. */
export const turn = (headingDeg: number, byDeg: number): number =>
  ((((headingDeg + byDeg - 1) % 360) + 360) % 360) + 1;

export const headingLabel = (headingDeg: number): string => String(headingDeg).padStart(3, '0');

export const runway: Runway = { designator: '27', headingDeg: 270 };

/** Straight down the runway, so the take-off and landing are into wind. */
export const windFromDeg = runway.headingDeg;

// The holding point is left of the take-off heading, so a pilot there has the wind on the left.
const holdingDeg = turn(runway.headingDeg, 90);

// The taxiway the aircraft vacates onto, to the apron it also leaves from.
const taxiwayDeg = turn(runway.headingDeg, 90);

// Left-hand circuit: the cruise phase flies the downwind leg.
const downwindDeg = turn(runway.headingDeg, 180);

export const phaseHeadings = {
  parking: taxiwayDeg,
  holding: holdingDeg,
  linedUp: runway.headingDeg,
  departure: runway.headingDeg,
  cruise: downwindDeg,
  approach: runway.headingDeg,
  landing: runway.headingDeg,
  taxiIn: taxiwayDeg,
  parkingSecuring: taxiwayDeg,
} as const;

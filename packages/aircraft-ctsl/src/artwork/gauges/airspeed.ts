import { needle } from './shared';

export const airspeedFace = new URL('../../assets/artwork/gauge-airspeed.svg', import.meta.url)
  .href;
const lance = new URL('../../assets/artwork/gauge-airspeed-needle.svg', import.meta.url).href;

/** D-MPGO's dial (intake §3.10.1): km/h against degrees clockwise from the rest index. */
export const airspeedScale = [
  [40, 10],
  [60, 32],
  [80, 54],
  [100, 76],
  [120, 98],
  [140, 119],
  [160, 141],
  [180, 163],
  [200, 185],
  [220, 207],
  [240, 229],
  [260, 249],
  [280, 270],
  [300, 293],
  [320, 318],
  [340, 340],
] as const satisfies readonly (readonly [number, number])[];

// The needle can only turn linearly with the value, so it follows the intake's rule, 1.10° per
// km/h through 40 km/h at 10° (§3.10.1, §9 question 52), and rests on the index below the scale.
const DEG_PER_KMH = 1.1;

export const airspeed = needle(
  airspeedFace,
  { min: 40 - 10 / DEG_PER_KMH, max: 340 },
  {
    min: 40,
    units: 'km/h',
    decimals: 0,
    ticks: airspeedScale.map(([kmh]) => kmh),
    arcs: [
      { from: 72, to: 115, colour: 'white' },
      { from: 94, to: 245, colour: 'green' },
      { from: 245, to: 300, colour: 'yellow' },
      { from: 299, to: 301, colour: 'red' },
    ],
  },
  { min: 0, max: 340 },
  { image: lance, glass: null },
);

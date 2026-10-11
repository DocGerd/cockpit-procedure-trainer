import { needle } from './shared';

export const airspeedFace = new URL('../../assets/artwork/gauge-airspeed.svg', import.meta.url)
  .href;

export const airspeed = needle(
  airspeedFace,
  { min: 40, max: 340 },
  {
    units: 'km/h',
    decimals: 0,
    ticks: [40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340],
    arcs: [
      { from: 72, to: 115, colour: 'white' },
      { from: 94, to: 245, colour: 'green' },
      { from: 245, to: 300, colour: 'yellow' },
      { from: 299, to: 301, colour: 'red' },
    ],
  },
);

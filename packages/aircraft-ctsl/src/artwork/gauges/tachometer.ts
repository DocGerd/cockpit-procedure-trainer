import { needle } from './shared';

export const tachometerFace = new URL('../../assets/artwork/gauge-tachometer.svg', import.meta.url)
  .href;

export const tachometer = needle(
  tachometerFace,
  { min: 0, max: 7000 },
  {
    units: 'rpm',
    decimals: 0,
    ticks: [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000],
    arcs: [
      { from: 1400, to: 5500, colour: 'green' },
      { from: 5500, to: 5800, colour: 'yellow' },
      { from: 5800, to: 7000, colour: 'red' },
    ],
  },
);

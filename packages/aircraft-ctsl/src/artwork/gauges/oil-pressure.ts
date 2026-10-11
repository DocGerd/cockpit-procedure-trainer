import { needle } from './shared';

export const oilPressureFace = new URL(
  '../../assets/artwork/gauge-oil-pressure.svg',
  import.meta.url,
).href;

export const oilPressure = needle(
  oilPressureFace,
  { min: 0, max: 10 },
  {
    units: 'bar',
    decimals: 1,
    ticks: [0, 2, 4, 6, 8, 10],
    arcs: [
      { from: 0, to: 0.8, colour: 'red' },
      { from: 0.8, to: 2, colour: 'yellow' },
      { from: 2, to: 5, colour: 'green' },
      { from: 5, to: 10, colour: 'red' },
    ],
  },
);

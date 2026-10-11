import { needle } from './shared';

export const chtFace = new URL('../../assets/artwork/gauge-cht.svg', import.meta.url).href;

export const cht = needle(
  chtFace,
  { min: 40, max: 150 },
  {
    units: '°C',
    decimals: 0,
    ticks: [40, 50, 70, 90, 110, 120, 150],
    arcs: [
      { from: 50, to: 120, colour: 'green' },
      { from: 120, to: 150, colour: 'red' },
    ],
  },
);

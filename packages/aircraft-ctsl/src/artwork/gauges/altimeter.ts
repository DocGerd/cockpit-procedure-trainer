import { needle } from './shared';

export const altimeterFace = new URL('../../assets/artwork/gauge-altimeter.svg', import.meta.url)
  .href;

export const altimeter = needle(
  altimeterFace,
  { min: 0, max: 5000 },
  { units: 'ft', decimals: 0, ticks: [0, 1000, 2000, 3000, 4000, 5000] },
);

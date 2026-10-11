import { needle } from './shared';

export const verticalSpeedFace = new URL('../../assets/artwork/gauge-vsi.svg', import.meta.url)
  .href;

export const verticalSpeed = needle(
  verticalSpeedFace,
  { min: -2000, max: 2000 },
  {
    units: 'ft/min',
    decimals: 0,
    ticks: [-2000, -1500, -1000, -500, 0, 500, 1000, 1500, 2000],
  },
  { min: -225, max: 45 },
);

import type { ArtworkAppearance } from '@cpt/core';
import { needle } from './shared';

export const verticalSpeedFace = new URL('../../assets/artwork/gauge-vsi.svg', import.meta.url)
  .href;
const verticalSpeedNeedle = new URL('../../assets/artwork/gauge-vsi-needle.svg', import.meta.url)
  .href;
const verticalSpeedGlass = new URL('../../assets/artwork/gauge-vsi-glass.svg', import.meta.url)
  .href;

const base = needle(
  verticalSpeedFace,
  { min: -2000, max: 2000 },
  {
    units: 'ft/min',
    decimals: 0,
    ticks: [-2000, -1500, -1000, -500, 0, 500, 1000, 1500, 2000],
  },
  { min: -270, max: 90 },
);

const { moving } = base.artwork;
if (moving.type !== 'needle') throw new Error('the VSI draws a needle');

export const verticalSpeed: ArtworkAppearance = {
  ...base,
  artwork: {
    ...base.artwork,
    moving: { ...moving, image: verticalSpeedNeedle },
    glass: verticalSpeedGlass,
  },
};

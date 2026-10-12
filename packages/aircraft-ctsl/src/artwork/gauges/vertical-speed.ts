import { needle } from './shared';

const asset = (file: string) => new URL(`../../assets/artwork/${file}`, import.meta.url).href;

export const verticalSpeedFace = asset('gauge-vsi.svg');

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

export const verticalSpeed = {
  ...base,
  artwork: {
    ...base.artwork,
    moving: { ...base.artwork.moving, image: asset('gauge-vsi-needle.svg') },
    glass: asset('gauge-vsi-glass.svg'),
  },
};

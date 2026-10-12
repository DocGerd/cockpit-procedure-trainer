import type { ArtworkAppearance } from '@cpt/core';

export const tachometerFace = new URL('../../assets/artwork/gauge-tachometer.svg', import.meta.url)
  .href;
export const tachometerNeedle = new URL(
  '../../assets/artwork/gauge-tach-needle.svg',
  import.meta.url,
).href;

const valueRange = { min: 0, max: 7000 };

// No glass: the shared one draws a hub cap and glare the photographed dial lacks.
export const tachometer: ArtworkAppearance = {
  options: {
    ...valueRange,
    needleShadow: true,
    units: 'rpm',
    decimals: 0,
    ticks: [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000],
    arcs: [
      { from: 0, to: 1400, colour: 'red' },
      { from: 1400, to: 1800, colour: 'yellow' },
      { from: 1800, to: 5500, colour: 'green' },
      { from: 5500, to: 5800, colour: 'yellow' },
      { from: 5780, to: 5820, colour: 'red' },
    ],
  },
  artwork: {
    face: tachometerFace,
    moving: {
      type: 'needle',
      image: tachometerNeedle,
      pivot: { x: 100, y: 100 },
      angleRange: { min: -142, max: 142 },
      valueRange,
    },
  },
};

import type { ArtworkAppearance, JsonObject } from '@cpt/core';

export const needleImage = new URL('../../assets/artwork/needle.svg', import.meta.url).href;
export const engineGaugePointer = new URL(
  '../../assets/artwork/gauge-engine-pointer.svg',
  import.meta.url,
).href;
export const glassImage = new URL('../../assets/artwork/glass-gauge.svg', import.meta.url).href;

export const needle = (
  face: string,
  valueRange: { min: number; max: number },
  options: JsonObject,
  angleRange = { min: -135, max: 135 },
): ArtworkAppearance => ({
  options: { ...valueRange, needleShadow: true, ...options },
  artwork: {
    face,
    moving: {
      type: 'needle',
      image: needleImage,
      pivot: { x: 100, y: 100 },
      angleRange,
      valueRange,
    },
    glass: glassImage,
  },
});

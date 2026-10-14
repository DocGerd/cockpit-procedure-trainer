import type { ArtworkAppearance, JsonObject } from '@cpt/core';

export const engineGaugePointer = new URL(
  '../../assets/artwork/gauge-engine-pointer.svg',
  import.meta.url,
).href;

/** Without `glass` the dial has no glass, glare or hub cap. */
export type NeedleParts = { readonly image: string; readonly glass?: string };

export const needle = (
  face: string,
  valueRange: { min: number; max: number },
  options: JsonObject,
  angleRange = { min: -135, max: 135 },
  { image, glass }: NeedleParts,
): ArtworkAppearance => ({
  options: { ...valueRange, needleShadow: true, ...options },
  artwork: {
    face,
    moving: {
      type: 'needle',
      image,
      pivot: { x: 100, y: 100 },
      angleRange,
      valueRange,
    },
    ...(glass === undefined ? {} : { glass }),
  },
});

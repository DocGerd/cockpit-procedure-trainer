import type { ArtworkAppearance, JsonObject } from '@cpt/core';

export const needleImage = new URL('../../assets/artwork/needle.svg', import.meta.url).href;
export const glassImage = new URL('../../assets/artwork/glass-gauge.svg', import.meta.url).href;

/** `glass: null` leaves the dial without glass, glare or hub cap. */
export type NeedleParts = { readonly image?: string; readonly glass?: string | null };

export const needle = (
  face: string,
  valueRange: { min: number; max: number },
  options: JsonObject,
  angleRange = { min: -135, max: 135 },
  { image = needleImage, glass = glassImage }: NeedleParts = {},
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
    ...(glass === null ? {} : { glass }),
  },
});

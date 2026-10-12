import type { ArtworkAppearance } from '@cpt/core';

export const slipIndicatorFace = new URL('../../assets/artwork/gauge-slip.svg', import.meta.url)
  .href;
const slipBallCentred = new URL('../../assets/artwork/gauge-slip-ball.svg', import.meta.url).href;

export const slipIndicator = {
  artwork: {
    face: slipIndicatorFace,
    moving: { type: 'positions', images: { centred: slipBallCentred } },
  },
} as const satisfies ArtworkAppearance;

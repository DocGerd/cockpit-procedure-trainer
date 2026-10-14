import type { ArtworkAppearance } from '@cpt/core';

export const slipIndicatorFace = new URL('../../assets/artwork/gauge-slip.svg', import.meta.url)
  .href;
const slipBall = new URL('../../assets/artwork/gauge-slip-ball.svg', import.meta.url).href;

export const slipIndicator = {
  // null stops the app's lamp wording (Lit/Off) from entering the accessible name.
  options: { stateLabels: null },
  artwork: {
    face: slipIndicatorFace,
    moving: { type: 'positions', images: { true: slipBall } },
  },
} as const satisfies ArtworkAppearance;

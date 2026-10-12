import type { ArtworkAppearance } from '@cpt/core';

export const hourMeterFace = new URL('../../assets/artwork/gauge-hour-meter.svg', import.meta.url)
  .href;
const running = new URL('../../assets/artwork/gauge-hour-meter-running.svg', import.meta.url).href;
const stopped = new URL('../../assets/artwork/gauge-hour-meter-stopped.svg', import.meta.url).href;

export const hourMeter = {
  // null stops the app's lamp wording (Lit/Off) from entering the accessible name.
  options: { stateLabels: null },
  artwork: {
    face: hourMeterFace,
    moving: { type: 'positions', images: { false: stopped, true: running } },
  },
} as const satisfies ArtworkAppearance;

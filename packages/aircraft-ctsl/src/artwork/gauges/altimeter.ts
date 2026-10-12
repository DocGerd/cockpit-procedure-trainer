import type { ArtworkAppearance, NeedleHand } from '@cpt/core';

export const altimeterFace = new URL('../../assets/artwork/gauge-altimeter.svg', import.meta.url)
  .href;
export const altimeterHands = {
  tenThousands: new URL('../../assets/artwork/gauge-altimeter-10000.svg', import.meta.url).href,
  thousands: new URL('../../assets/artwork/gauge-altimeter-1000.svg', import.meta.url).href,
  hundreds: new URL('../../assets/artwork/gauge-altimeter-100.svg', import.meta.url).href,
} as const;
export const altimeterGlass = new URL(
  '../../assets/artwork/gauge-altimeter-glass.svg',
  import.meta.url,
).href;
export const altimeterKnobFace = new URL(
  '../../assets/artwork/gauge-altimeter-knob.svg',
  import.meta.url,
).href;
export const altimeterKnobRim = new URL(
  '../../assets/artwork/gauge-altimeter-rim.svg',
  import.meta.url,
).href;

const pivot = { x: 100, y: 100 } as const;
const hand = (image: string, valuePerTurn: number): NeedleHand => ({ image, pivot, valuePerTurn });

// Intake §3.10.2: the hairline under the broad blade, the long pointer on top.
export const altimeter: ArtworkAppearance = {
  options: { units: 'ft', decimals: 0, needleShadow: true },
  artwork: {
    face: altimeterFace,
    moving: {
      type: 'needles',
      needles: [
        hand(altimeterHands.tenThousands, 100_000),
        hand(altimeterHands.thousands, 10_000),
        hand(altimeterHands.hundreds, 1000),
      ],
    },
    glass: altimeterGlass,
    windows: { setting: { at: { x: 156, y: 100 }, fontSize: 8 } },
  },
};

// The knob face's own coordinates: the view places it so its centre lies on the drawn knob.
export const ALTIMETER_KNOB_CENTRE = { x: 50, y: 47.5 } as const;
const DEGREES_PER_HPA = 12;

export const altimeterKnob = (detents: number): ArtworkAppearance => ({
  artwork: {
    face: altimeterKnobFace,
    moving: {
      type: 'needle',
      image: altimeterKnobRim,
      pivot: ALTIMETER_KNOB_CENTRE,
      angleRange: { min: 0, max: (detents - 1) * DEGREES_PER_HPA },
      valueRange: { min: 0, max: 1 },
    },
    lettering: ['hPa'],
  },
});

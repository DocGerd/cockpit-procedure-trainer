import type { ArtworkAppearance, JsonObject } from '@cpt/core';

export const chtFace = new URL('../../assets/artwork/gauge-cht.svg', import.meta.url).href;
export const temperaturePointer = new URL(
  '../../assets/artwork/gauge-cht-needle.svg',
  import.meta.url,
).href;

/** The temperature dials sweep 2.7 degrees per °C up to the knee and 1.65 above it (intake §3.10.6). */
export const DIAL = {
  min: 40,
  knee: 120,
  max: 150,
  startAngle: -130,
  lowDegPerC: 2.7,
  highDegPerC: 1.65,
} as const;

export const dialAngle = (celsius: number): number =>
  celsius <= DIAL.knee
    ? DIAL.startAngle + DIAL.lowDegPerC * (celsius - DIAL.min)
    : DIAL.startAngle +
      DIAL.lowDegPerC * (DIAL.knee - DIAL.min) +
      DIAL.highDegPerC * (celsius - DIAL.knee);

/** The needle turns linearly in this value, which equals the temperature up to the knee. */
export const dialValue = (celsius: number): number =>
  celsius <= DIAL.knee
    ? celsius
    : DIAL.knee + ((celsius - DIAL.knee) * DIAL.highDegPerC) / DIAL.lowDegPerC;

type Arc = { from: number; to: number; colour: 'green' | 'yellow' | 'red' };

export const temperatureDial = (face: string, arcs: readonly Arc[]): ArtworkAppearance => {
  const valueRange = { min: DIAL.min, max: dialValue(DIAL.max) };
  const options: JsonObject = {
    ...valueRange,
    needleShadow: true,
    units: '°C',
    decimals: 0,
    ticks: [40, 60, 80, 100, 120],
    arcs: arcs.map(({ from, to, colour }) => ({
      from: dialValue(from),
      to: dialValue(to),
      colour,
    })),
  };
  return {
    options,
    artwork: {
      face,
      moving: {
        type: 'needle',
        image: temperaturePointer,
        pivot: { x: 100, y: 100 },
        angleRange: { min: dialAngle(DIAL.min), max: dialAngle(DIAL.max) },
        valueRange,
      },
    },
  };
};

export const cht = temperatureDial(chtFace, [
  { from: 90, to: 110, colour: 'green' },
  { from: 110, to: 119, colour: 'yellow' },
  { from: 119.5, to: 120.5, colour: 'red' },
]);

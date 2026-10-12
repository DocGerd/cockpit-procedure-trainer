import type { ArtworkAppearance, JsonObject } from '@cpt/core';

export const temperaturePointer = new URL(
  '../../assets/artwork/gauge-cht-needle.svg',
  import.meta.url,
).href;

/** The temperature dials sweep at one rate up to the knee and a slower one above it (intake §3.10.6). */
export const DIAL = {
  min: 40,
  knee: 120,
  max: 150,
  startAngle: -130,
  lowDegPerC: 2.7,
  highDegPerC: 1.65,
  rest: 47,
} as const;

export const dialAngle = (celsius: number): number =>
  celsius <= DIAL.knee
    ? DIAL.startAngle + DIAL.lowDegPerC * (celsius - DIAL.min)
    : DIAL.startAngle +
      DIAL.lowDegPerC * (DIAL.knee - DIAL.min) +
      DIAL.highDegPerC * (celsius - DIAL.knee);

type Arc = { from: number; to: number; colour: 'green' | 'yellow' | 'red' };

export const temperatureDial = (face: string, arcs: readonly Arc[]): ArtworkAppearance => {
  const valueRange = { min: DIAL.min, max: DIAL.max };
  const options: JsonObject = {
    ...valueRange,
    needleShadow: true,
    units: '°C',
    decimals: 0,
    ticks: [40, 60, 80, 100, 120, 150],
    arcs: arcs.map((arc) => ({ ...arc })),
  };
  return {
    options,
    artwork: {
      face,
      moving: {
        type: 'needle',
        image: temperaturePointer,
        pivot: { x: 100, y: 100 },
        angleRange: { min: dialAngle(DIAL.rest), max: dialAngle(DIAL.max) },
        valueRange,
        stops: [DIAL.rest, DIAL.knee, DIAL.max].map((value) => ({
          value,
          angle: dialAngle(value),
        })),
      },
    },
  };
};

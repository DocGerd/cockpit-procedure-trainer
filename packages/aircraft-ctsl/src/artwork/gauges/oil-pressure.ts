import type { ArtworkAppearance } from '@cpt/core';
import { engineGaugePointer } from './voltmeter';

export const oilPressureFace = new URL(
  '../../assets/artwork/gauge-oil-pressure.svg',
  import.meta.url,
).href;

const ZERO_MARK = -124;
const DEGREES_PER_BAR = 24;
const SEGMENT_END_BAR = 7;

// The needle turns linearly, so it follows the first segment of the dial and stops on the 7 mark.
export const oilPressure: ArtworkAppearance = {
  options: {
    min: 0,
    max: 10,
    needleShadow: true,
    units: 'bar',
    decimals: 1,
    ticks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    arcs: [
      { from: 1, to: 2, colour: 'yellow' },
      { from: 5, to: 6, colour: 'green' },
      { from: 6, to: 7, colour: 'yellow' },
      { from: 6.9, to: 7.1, colour: 'red' },
    ],
  },
  artwork: {
    face: oilPressureFace,
    moving: {
      type: 'needle',
      image: engineGaugePointer,
      pivot: { x: 100, y: 100 },
      angleRange: { min: ZERO_MARK, max: ZERO_MARK + DEGREES_PER_BAR * SEGMENT_END_BAR },
      valueRange: { min: 0, max: SEGMENT_END_BAR },
    },
  },
};

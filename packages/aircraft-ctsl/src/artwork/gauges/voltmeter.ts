import type { ArtworkAppearance } from '@cpt/core';
import { engineGaugePointer } from './shared';

export const voltmeterFace = new URL('../../assets/artwork/gauge-voltmeter.svg', import.meta.url)
  .href;

const DEGREES_PER_VOLT = 31;

export const voltmeter: ArtworkAppearance = {
  options: {
    min: 9,
    max: 17,
    needleShadow: true,
    units: 'V',
    decimals: 1,
    ticks: [9, 10, 11, 12, 13, 14, 15, 16, 17],
    arcs: [],
  },
  artwork: {
    face: voltmeterFace,
    moving: {
      type: 'needle',
      image: engineGaugePointer,
      pivot: { x: 100, y: 100 },
      angleRange: { min: DEGREES_PER_VOLT * (9 - 13), max: DEGREES_PER_VOLT * (17 - 13) },
      valueRange: { min: 9, max: 17 },
    },
  },
};

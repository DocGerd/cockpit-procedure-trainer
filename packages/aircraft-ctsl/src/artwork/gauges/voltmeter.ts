import { needle } from './shared';

export const voltmeterFace = new URL('../../assets/artwork/gauge-voltmeter.svg', import.meta.url)
  .href;

export const voltmeter = needle(
  voltmeterFace,
  { min: 9, max: 17 },
  {
    units: 'V',
    decimals: 1,
    ticks: [9, 10, 11, 12, 13, 14, 15, 16, 17],
    arcs: [
      { from: 9, to: 10.5, colour: 'red' },
      { from: 10.5, to: 11.5, colour: 'yellow' },
      { from: 11.5, to: 15, colour: 'green' },
      { from: 15, to: 16, colour: 'yellow' },
      { from: 16, to: 17, colour: 'red' },
    ],
  },
);

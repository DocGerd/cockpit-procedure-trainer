import { needle } from './shared';

export const oilTemperatureFace = new URL(
  '../../assets/artwork/gauge-oil-temperature.svg',
  import.meta.url,
).href;

export const oilTemperature = needle(
  oilTemperatureFace,
  { min: 40, max: 150 },
  {
    units: '°C',
    decimals: 0,
    ticks: [40, 50, 70, 90, 110, 130, 150],
    arcs: [
      { from: 50, to: 90, colour: 'yellow' },
      { from: 90, to: 110, colour: 'green' },
      { from: 110, to: 130, colour: 'yellow' },
      { from: 130, to: 150, colour: 'red' },
    ],
  },
);

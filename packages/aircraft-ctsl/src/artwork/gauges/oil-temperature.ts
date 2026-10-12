import { temperatureDial } from './cht';

export const oilTemperatureFace = new URL(
  '../../assets/artwork/gauge-oil-temperature.svg',
  import.meta.url,
).href;

export const oilTemperature = temperatureDial(oilTemperatureFace, [
  { from: 90, to: 110, colour: 'green' },
  { from: 110, to: 127, colour: 'yellow' },
  { from: 127, to: 130, colour: 'red' },
]);

import { temperatureDial } from './temperature-dial';

export const chtFace = new URL('../../assets/artwork/gauge-cht.svg', import.meta.url).href;

export const cht = temperatureDial(chtFace, [
  { from: 90, to: 110, colour: 'green' },
  { from: 110, to: 119, colour: 'yellow' },
  { from: 119.5, to: 120.5, colour: 'red' },
]);

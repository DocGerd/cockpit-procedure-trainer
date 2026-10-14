import { CHT_GREEN_C, CHT_RED_LINE_C } from '../../cht-limits';
import { temperatureDial } from './temperature-dial';

export const chtFace = new URL('../../assets/artwork/gauge-cht.svg', import.meta.url).href;

export const cht = temperatureDial(chtFace, [
  { from: CHT_GREEN_C[0], to: CHT_GREEN_C[1], colour: 'green' },
  { from: CHT_GREEN_C[1], to: CHT_RED_LINE_C - 1, colour: 'yellow' },
  { from: CHT_RED_LINE_C - 0.5, to: CHT_RED_LINE_C + 0.5, colour: 'red' },
]);

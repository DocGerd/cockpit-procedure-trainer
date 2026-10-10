import type { DeviceScreenEntry } from '@cpt/panel-kit';
import { Atr833Display } from './display/Atr833Display';
import { atr833Readout } from './logic';
import { Atr833Screen } from './screen';

export const atr833ScreenEntry: DeviceScreenEntry = {
  Screen: Atr833Screen,
  Display: Atr833Display,
  readout: atr833Readout,
  floor: { width: 464, height: 218 },
};

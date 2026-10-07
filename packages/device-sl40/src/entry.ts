import type { DeviceScreenEntry } from '@cpt/panel-kit';
import { Sl40Display } from './display/Sl40Display';
import { sl40Readout } from './logic';
import { Sl40Screen } from './screen';

export const sl40ScreenEntry: DeviceScreenEntry = {
  Screen: Sl40Screen,
  Display: Sl40Display,
  readout: sl40Readout,
  floor: { width: 376, height: 130 },
};

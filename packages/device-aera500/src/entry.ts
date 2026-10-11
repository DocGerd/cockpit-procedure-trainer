import type { DeviceScreenEntry } from '@cpt/panel-kit';
import { Aera500Display } from './display/Aera500Display';
import { aera500Readout } from './logic';
import { Aera500Screen } from './screen';

export const aera500ScreenEntry: DeviceScreenEntry = {
  Screen: Aera500Screen,
  Display: Aera500Display,
  readout: aera500Readout,
  floor: { width: 424, height: 324 },
};

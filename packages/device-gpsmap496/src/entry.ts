import type { DeviceScreenEntry } from '@cpt/panel-kit';
import { Gpsmap496Display } from './display/Gpsmap496Display';
import { gpsmap496Readout } from './logic';
import { Gpsmap496Screen } from './screen';

export const gpsmap496ScreenEntry: DeviceScreenEntry = {
  Screen: Gpsmap496Screen,
  Display: Gpsmap496Display,
  readout: gpsmap496Readout,
  floor: { width: 244, height: 184 },
};

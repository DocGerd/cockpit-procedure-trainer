import type { DeviceScreenEntry } from '@cpt/panel-kit';
import { ComDisplay } from './display/ComDisplay';
import { comReadout } from './logic';
import { ComScreen } from './screen';

export const comScreenEntry: DeviceScreenEntry = {
  Screen: ComScreen,
  Display: ComDisplay,
  readout: comReadout,
  floor: { width: 480, height: 192 },
};

import type { DeviceScreenEntry } from '@cpt/panel-kit';
import { FlarmDisplay } from './display/FlarmDisplay';
import { flarmReadout } from './logic';
import { FlarmScreen } from './screen';

export const flarmScreenEntry: DeviceScreenEntry = {
  Screen: FlarmScreen,
  Display: FlarmDisplay,
  readout: flarmReadout,
  floor: { width: 360, height: 284 },
};

import type { DeviceScreenEntry } from '@cpt/panel-kit';
import { Trt800hDisplay } from './display/Trt800hDisplay';
import { trt800hReadout } from './logic';
import { Trt800hScreen } from './screen';

export const trt800hScreenEntry: DeviceScreenEntry = {
  Screen: Trt800hScreen,
  Display: Trt800hDisplay,
  readout: trt800hReadout,
  floor: { width: 360, height: 308 },
  face: 'own',
};

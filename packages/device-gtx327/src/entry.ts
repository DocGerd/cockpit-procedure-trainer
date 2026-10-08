import type { DeviceScreenEntry } from '@cpt/panel-kit';
import { Gtx327Display } from './display/Gtx327Display';
import { gtx327Readout } from './logic';
import { Gtx327Screen } from './screen';

export const gtx327ScreenEntry: DeviceScreenEntry = {
  Screen: Gtx327Screen,
  Display: Gtx327Display,
  readout: gtx327Readout,
  floor: { width: 424, height: 156 },
};

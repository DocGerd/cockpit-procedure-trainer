import type { DeviceScreenEntry } from '@cpt/panel-kit';
import { TransponderDisplay } from './display/TransponderDisplay';
import { transponderReadout } from './logic';
import { TransponderScreen } from './screen';

export const transponderScreenEntry: DeviceScreenEntry = {
  Screen: TransponderScreen,
  Display: TransponderDisplay,
  readout: transponderReadout,
  floor: { width: 608, height: 184 },
};

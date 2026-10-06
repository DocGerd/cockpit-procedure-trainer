import type { Device } from '@cpt/core';
import { ComScreen, comDevice } from '@cpt/device-com';
import { Gpsmap496Screen, gpsmap496Device } from '@cpt/device-gpsmap496';
import { Gtx327Screen, gtx327Device } from '@cpt/device-gtx327';
import { Sl40Screen, sl40Device } from '@cpt/device-sl40';
import { TransponderScreen, transponderDevice } from '@cpt/device-transponder';
import type { DeviceScreenProps } from '@cpt/panel-kit';
import type { ComponentType } from 'react';

export const deviceRegistry: readonly Device[] = [
  comDevice,
  sl40Device,
  gtx327Device,
  gpsmap496Device,
  transponderDevice,
];

/** Screens keyed by device id; a device without an entry shows a placeholder. */
export const deviceScreens: Readonly<Record<string, ComponentType<DeviceScreenProps>>> = {
  [comDevice.id]: ComScreen,
  [sl40Device.id]: Sl40Screen,
  [gtx327Device.id]: Gtx327Screen,
  [gpsmap496Device.id]: Gpsmap496Screen,
  [transponderDevice.id]: TransponderScreen,
};

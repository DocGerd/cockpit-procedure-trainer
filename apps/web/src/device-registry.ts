import type { Device } from '@cpt/core';
import { comDevice, comScreenEntry } from '@cpt/device-com';
import { gpsmap496Device, gpsmap496ScreenEntry } from '@cpt/device-gpsmap496';
import { gtx327Device, gtx327ScreenEntry } from '@cpt/device-gtx327';
import { sl40Device, sl40ScreenEntry } from '@cpt/device-sl40';
import { transponderDevice, transponderScreenEntry } from '@cpt/device-transponder';
import type { DeviceScreenEntry, DeviceScreenProps } from '@cpt/panel-kit';
import type { ComponentType } from 'react';

export const deviceRegistry: readonly Device[] = [
  comDevice,
  sl40Device,
  gtx327Device,
  gpsmap496Device,
  transponderDevice,
];

/** What each device draws, keyed by device id; a device without an entry shows a placeholder. */
export const deviceEntries: Readonly<Record<string, DeviceScreenEntry>> = {
  [comDevice.id]: comScreenEntry,
  [sl40Device.id]: sl40ScreenEntry,
  [gtx327Device.id]: gtx327ScreenEntry,
  [gpsmap496Device.id]: gpsmap496ScreenEntry,
  [transponderDevice.id]: transponderScreenEntry,
};

/** The operable screens of `deviceEntries`. */
export const deviceScreens: Readonly<Record<string, ComponentType<DeviceScreenProps>>> =
  Object.fromEntries(Object.entries(deviceEntries).map(([id, entry]) => [id, entry.Screen]));

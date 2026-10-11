import type { Device } from '@cpt/core';
import { aera500Device, aera500ScreenEntry } from '@cpt/device-aera500';
import { atr833Device, atr833ScreenEntry } from '@cpt/device-atr833';
import { comDevice, comScreenEntry } from '@cpt/device-com';
import { flarmDevice, flarmScreenEntry } from '@cpt/device-flarm';
import { transponderDevice, transponderScreenEntry } from '@cpt/device-transponder';
import { trt800hDevice, trt800hScreenEntry } from '@cpt/device-trt800h';
import type { DeviceScreenEntry, DeviceScreenProps } from '@cpt/panel-kit';
import type { ComponentType } from 'react';

export const deviceRegistry: readonly Device[] = [
  aera500Device,
  comDevice,
  atr833Device,
  flarmDevice,
  transponderDevice,
  trt800hDevice,
];

/** What each device draws, keyed by device id; a device without an entry shows a placeholder. */
export const deviceEntries: Readonly<Record<string, DeviceScreenEntry>> = {
  [aera500Device.id]: aera500ScreenEntry,
  [comDevice.id]: comScreenEntry,
  [atr833Device.id]: atr833ScreenEntry,
  [flarmDevice.id]: flarmScreenEntry,
  [transponderDevice.id]: transponderScreenEntry,
  [trt800hDevice.id]: trt800hScreenEntry,
};

/** The operable screens of `deviceEntries`. */
export const deviceScreens: Readonly<Record<string, ComponentType<DeviceScreenProps>>> =
  Object.fromEntries(Object.entries(deviceEntries).map(([id, entry]) => [id, entry.Screen]));

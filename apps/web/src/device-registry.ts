import type { Device } from '@cpt/core';
import { ComScreen, comDevice } from '@cpt/device-com';
import { Sl40Screen, sl40Device } from '@cpt/device-sl40';
import { TransponderScreen, transponderDevice } from '@cpt/device-transponder';
import type { DeviceScreenProps } from '@cpt/panel-kit';
import type { ComponentType } from 'react';

export const deviceRegistry: readonly Device[] = [comDevice, sl40Device, transponderDevice];

/** Screens keyed by device id; a device without an entry shows a placeholder. */
export const deviceScreens: Readonly<Record<string, ComponentType<DeviceScreenProps>>> = {
  [comDevice.id]: ComScreen,
  [sl40Device.id]: Sl40Screen,
  [transponderDevice.id]: TransponderScreen,
};

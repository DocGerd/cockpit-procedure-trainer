import type { Device } from '@cpt/core';
import { ComScreen, comDevice } from '@cpt/device-com';
import { TransponderScreen, transponderDevice } from '@cpt/device-transponder';
import type { DeviceScreenProps } from '@cpt/panel-kit';
import type { ComponentType } from 'react';

export const deviceRegistry: readonly Device[] = [comDevice, transponderDevice];

/** Screens keyed by device id; a device without an entry shows a placeholder. */
export const deviceScreens: Readonly<Record<string, ComponentType<DeviceScreenProps>>> = {
  [comDevice.id]: ComScreen,
  [transponderDevice.id]: TransponderScreen,
};

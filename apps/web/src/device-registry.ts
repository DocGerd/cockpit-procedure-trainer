import type { Device } from '@cpt/core';
import type { DeviceScreenProps } from '@cpt/panel-kit';
import type { ComponentType } from 'react';

export const deviceRegistry: readonly Device[] = [];

/** Screens keyed by device id; a device without an entry shows a placeholder. */
export const deviceScreens: Readonly<Record<string, ComponentType<DeviceScreenProps>>> = {};

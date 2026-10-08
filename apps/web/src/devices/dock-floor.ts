import type { DeviceFloor } from '@cpt/panel-kit';
import { deviceEntries } from '../device-registry';

export type { DeviceFloor };

/** The smallest size at which the device's Screen keeps every button at the touch-target size. */
export const deviceFloor = (deviceId: string): DeviceFloor | undefined =>
  Object.hasOwn(deviceEntries, deviceId) ? deviceEntries[deviceId]?.floor : undefined;

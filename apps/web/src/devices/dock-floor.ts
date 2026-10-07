export type DeviceFloor = { readonly width: number; readonly height: number };

const floors: Readonly<Record<string, DeviceFloor>> = {};

/** The smallest size at which the device's Screen keeps every button at the touch-target size. */
export const deviceFloor = (deviceId: string): DeviceFloor | undefined =>
  Object.hasOwn(floors, deviceId) ? floors[deviceId] : undefined;

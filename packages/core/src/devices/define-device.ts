import type { ControlRecord, Device, DeviceDefinition } from '../contract';

export function defineDevice<D, const DC extends ControlRecord>(
  definition: DeviceDefinition<D, DC>,
): Device {
  // The type parameters only constrain the input; the stored value is the erased Device.
  return definition as unknown as Device;
}

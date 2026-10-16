import type { ControlRecord, Device, DeviceDefinition } from '../contract';

export function defineDevice<D, const DC extends ControlRecord, B extends string = string>(
  definition: DeviceDefinition<D, DC, B>,
): Device {
  // The type parameters only constrain the input; the stored value is the erased Device.
  return definition as unknown as Device;
}

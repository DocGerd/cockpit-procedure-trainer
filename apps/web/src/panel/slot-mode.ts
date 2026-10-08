import type { DeviceFloor } from '@cpt/panel-kit';
import type { Size } from './zoom';

export type SlotMode = 'mirror' | 'operable';

/** Whether a slot may be operated in place; off, so every slot mirrors its device. */
export const IN_SLOT_OPERATION = false;

/** `operable` only when the option is on and the device's floor fits inside the slot on both axes. */
export function slotMode(slotBox: Size, floor: DeviceFloor, option: boolean): SlotMode {
  return option && floor.width <= slotBox.width && floor.height <= slotBox.height
    ? 'operable'
    : 'mirror';
}

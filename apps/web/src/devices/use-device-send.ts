import type { ControlPosition } from '@cpt/core';
import type { DeviceScreenProps } from '@cpt/panel-kit';
import { useCallback } from 'react';
import { usePanelInputs } from '../modes/panel-input';

/** The `send` a device Screen gets: routes its presses and sets to the installed device's controls. */
export function useDeviceSend(installId: string): DeviceScreenProps['send'] {
  const inputs = usePanelInputs();
  return useCallback<DeviceScreenProps['send']>(
    (controlId, action, position?: ControlPosition) => {
      const id = `${installId}.${controlId}`;
      const input = inputs(id);
      if (action === 'set') {
        if (position !== undefined) {
          input.onSet(position);
        } else {
          const error = new Error(`Device screen sent a set for "${id}" without a position`);
          if (import.meta.env.DEV) throw error;
          console.error(error);
        }
      } else if (action === 'press') {
        input.onPress(position);
      } else {
        input.onRelease();
      }
    },
    [inputs, installId],
  );
}

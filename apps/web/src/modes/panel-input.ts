import type { ControlWidgetProps } from '@cpt/panel-kit';
import { useMemo } from 'react';
import { useTrainer } from '../trainer';

export type PanelInput = Pick<
  ControlWidgetProps,
  'onSet' | 'onPress' | 'onRelease' | 'onOpenGuard' | 'onCloseGuard'
>;

export function usePanelInput(controlId: string): PanelInput {
  const { session } = useTrainer();
  return useMemo(
    () => ({
      onSet: (position) => {
        session.set(controlId, position);
      },
      onPress: (position) => {
        if (position === undefined) session.press(controlId);
        else session.press(controlId, position);
      },
      onRelease: () => {
        session.release(controlId);
      },
      onOpenGuard: () => {
        session.openGuard(controlId);
      },
      onCloseGuard: () => {
        session.closeGuard(controlId);
      },
    }),
    [session, controlId],
  );
}

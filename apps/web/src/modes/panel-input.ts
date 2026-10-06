import type { Session } from '@cpt/core';
import type { ControlWidgetProps } from '@cpt/panel-kit';
import { useCallback, useMemo } from 'react';
import { useTrainer } from '../trainer';
import type { Mode } from '../trainer';
import { useExploreStore } from './explore-state';
import type { ExploreStore } from './explore-state';

export type PanelInput = Pick<
  ControlWidgetProps,
  'onSet' | 'onPress' | 'onRelease' | 'onOpenGuard' | 'onCloseGuard'
>;

function panelInput(
  session: Session,
  mode: Mode,
  explore: ExploreStore,
  controlId: string,
): PanelInput {
  const operates = () => mode !== 'explore' || explore.get().operate;
  const operate = (action: () => void) => {
    if (operates()) action();
    else explore.select(controlId);
  };
  return {
    onSet: (position) => {
      operate(() => session.set(controlId, position));
    },
    onPress: (position) => {
      operate(() => {
        if (position === undefined) session.press(controlId);
        else session.press(controlId, position);
      });
    },
    // A hold that began while operating must still end, or the control stays held.
    onRelease: () => {
      session.release(controlId);
    },
    onOpenGuard: () => {
      operate(() => session.openGuard(controlId));
    },
    onCloseGuard: () => {
      operate(() => session.closeGuard(controlId));
    },
  };
}

/** The widget handlers for a control: they operate it, except in Free explore with operating off, where they select it. */
export function usePanelInput(controlId: string): PanelInput {
  const { session, mode } = useTrainer();
  const explore = useExploreStore();
  return useMemo(
    () => panelInput(session, mode, explore, controlId),
    [session, mode, explore, controlId],
  );
}

/** `usePanelInput` for controls known only at call time, such as a device screen's. */
export function usePanelInputs(): (controlId: string) => PanelInput {
  const { session, mode } = useTrainer();
  const explore = useExploreStore();
  return useCallback(
    (controlId: string) => panelInput(session, mode, explore, controlId),
    [session, mode, explore],
  );
}

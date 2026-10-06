import { createContext, useContext, useMemo, useRef } from 'react';
import type { PanelInput } from '../modes/panel-input';

/**
 * Holds back what a control does while a first touch on it might still turn into a pinch. Only the
 * touched control is held; everything else, and any control without a hold, acts at once.
 */
export type TouchGate = {
  run(controlId: string, action: () => void): void;
  hold(controlId: string): void;
  /** Lets the held actions through, in order. */
  release(): void;
  /** Drops the held actions, and whatever `during` makes the controls do in reaction. */
  discard(during?: () => void): void;
};

export function createTouchGate(): TouchGate {
  let held: { controlId: string; actions: (() => void)[] } | undefined;
  let dropping: string | undefined;
  return {
    run(controlId, action) {
      if (dropping === controlId) return;
      if (held?.controlId === controlId) held.actions.push(action);
      else action();
    },
    hold(controlId) {
      held = { controlId, actions: [] };
    },
    release() {
      const actions = held?.actions;
      held = undefined;
      for (const action of actions ?? []) action();
    },
    discard(during) {
      dropping = held?.controlId;
      held = undefined;
      try {
        during?.();
      } finally {
        dropping = undefined;
      }
    },
  };
}

const IMMEDIATE: TouchGate = createTouchGate();

export const TouchGateContext = createContext<TouchGate>(IMMEDIATE);

/**
 * `input` for control `controlId` with its handlers passed through the panel's touch gate. A release
 * whose press already reached the session is never held back or dropped.
 */
export function useGatedInput(controlId: string, input: PanelInput): PanelInput {
  const gate = useContext(TouchGateContext);
  const pressed = useRef(false);
  return useMemo(() => {
    const release = () => {
      pressed.current = false;
      input.onRelease();
    };
    return {
      onSet: (position) => gate.run(controlId, () => input.onSet(position)),
      onPress: (position) =>
        gate.run(controlId, () => {
          pressed.current = true;
          input.onPress(position);
        }),
      onRelease: () => {
        if (pressed.current) release();
        else gate.run(controlId, release);
      },
      onOpenGuard: () => gate.run(controlId, () => input.onOpenGuard()),
      onCloseGuard: () => gate.run(controlId, () => input.onCloseGuard()),
    };
  }, [gate, controlId, input]);
}

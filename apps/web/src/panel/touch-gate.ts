import { createContext, useContext, useMemo } from 'react';
import type { PanelInput } from '../modes/panel-input';

/**
 * Holds back what a control does while a first touch might still turn into a pinch. Without a hold
 * `run` acts at once.
 */
export type TouchGate = {
  run(action: () => void): void;
  hold(): void;
  /** Lets the held actions through, in order. */
  release(): void;
  /** Drops the held actions, and whatever `during` makes the controls do in reaction. */
  discard(during?: () => void): void;
};

export function createTouchGate(): TouchGate {
  let held: (() => void)[] | undefined;
  let dropping = false;
  return {
    run(action) {
      if (dropping) return;
      if (held) held.push(action);
      else action();
    },
    hold() {
      held ??= [];
    },
    release() {
      const actions = held;
      held = undefined;
      for (const action of actions ?? []) action();
    },
    discard(during) {
      dropping = held !== undefined;
      held = undefined;
      try {
        during?.();
      } finally {
        dropping = false;
      }
    },
  };
}

const IMMEDIATE: TouchGate = createTouchGate();

export const TouchGateContext = createContext<TouchGate>(IMMEDIATE);

/** `input` with every handler passed through the panel's touch gate. */
export function useGatedInput(input: PanelInput): PanelInput {
  const gate = useContext(TouchGateContext);
  return useMemo(
    () => ({
      onSet: (position) => gate.run(() => input.onSet(position)),
      onPress: (position) => gate.run(() => input.onPress(position)),
      onRelease: () => gate.run(() => input.onRelease()),
      onOpenGuard: () => gate.run(() => input.onOpenGuard()),
      onCloseGuard: () => gate.run(() => input.onCloseGuard()),
    }),
    [gate, input],
  );
}

import { createControlStore } from '@cpt/core';
import type { ControlDefinition, ControlPosition } from '@cpt/core';
import { useEffect, useMemo, useReducer } from 'react';

export type ControlHandlers = {
  onSet(position: ControlPosition): void;
  onPress(position?: ControlPosition): void;
  onRelease(): void;
  onOpenGuard(): void;
  onCloseGuard(): void;
};

export type LocalControl = {
  position: ControlPosition;
  guardOpen: boolean;
  handlers: ControlHandlers;
};

export function useLocalControl(control: ControlDefinition): LocalControl {
  const store = useMemo(() => createControlStore({ c: control }), [control]);
  const [, bump] = useReducer((count: number) => count + 1, 0);
  useEffect(() => store.subscribe(bump), [store]);
  const handlers = useMemo<ControlHandlers>(
    () => ({
      onSet: (position) => void store.set('c', position),
      onPress: (position) => void store.press('c', position),
      onRelease: () => void store.release('c'),
      onOpenGuard: () => void store.openGuard('c'),
      onCloseGuard: () => void store.closeGuard('c'),
    }),
    [store],
  );
  return {
    position: store.positions()['c'] ?? control.initial,
    guardOpen: store.guards()['c'] === 'open',
    handlers,
  };
}

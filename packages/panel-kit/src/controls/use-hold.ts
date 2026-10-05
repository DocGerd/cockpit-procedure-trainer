import { useCallback, useEffect, useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

const isActivation = (event: KeyboardEvent) => event.key === 'Enter' || event.key === ' ';

export function useHold(onRelease: () => void) {
  const held = useRef(false);
  const release = useRef(onRelease);
  useEffect(() => {
    release.current = onRelease;
  }, [onRelease]);

  const end = useCallback(() => {
    if (!held.current) return;
    held.current = false;
    release.current();
  }, []);

  const begin = useCallback((press: () => void) => {
    if (held.current) return;
    held.current = true;
    press();
  }, []);

  useEffect(() => end, [end]);

  const handlers = (press: () => void) => ({
    onPointerDown: (event: PointerEvent) => {
      if (event.button === 0) begin(press);
    },
    onPointerUp: end,
    onPointerCancel: end,
    onPointerLeave: end,
    onBlur: end,
    onContextMenu: (event: { preventDefault(): void }) => event.preventDefault(),
    onKeyDown: (event: KeyboardEvent) => {
      if (!isActivation(event)) return;
      event.preventDefault();
      begin(press);
    },
    onKeyUp: (event: KeyboardEvent) => {
      if (isActivation(event)) end();
    },
  });

  return { begin, end, handlers };
}

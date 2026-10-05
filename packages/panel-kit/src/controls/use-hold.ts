import { useCallback, useEffect, useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

const isActivation = (event: KeyboardEvent) => event.key === 'Enter' || event.key === ' ';

export function useHold(onRelease: () => void) {
  const held = useRef(false);
  const clickPending = useRef(false);
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

  const abandon = () => {
    clickPending.current = false;
    end();
  };

  const handlers = (press: () => void) => ({
    onPointerDown: (event: PointerEvent) => {
      if (event.button !== 0) return;
      clickPending.current = true;
      begin(press);
    },
    onPointerUp: end,
    onPointerCancel: abandon,
    onPointerLeave: abandon,
    onBlur: abandon,
    onClick: () => {
      if (clickPending.current) {
        clickPending.current = false;
        return;
      }
      begin(press);
      end();
    },
    onContextMenu: (event: { preventDefault(): void }) => event.preventDefault(),
    onKeyDown: (event: KeyboardEvent) => {
      if (!isActivation(event)) return;
      event.preventDefault();
      begin(press);
    },
    onKeyUp: (event: KeyboardEvent) => {
      if (!isActivation(event)) return;
      event.preventDefault();
      end();
    },
  });

  return { begin, end, handlers };
}

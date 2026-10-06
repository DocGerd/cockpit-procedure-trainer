import { useCallback, useEffect, useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

const isActivation = (event: KeyboardEvent) => event.key === 'Enter' || event.key === ' ';

/** With the pointer captured, a drifting finger or mouse keeps the press until it is lifted or cancelled. */
function capture(element: Element, pointerId: number): boolean {
  try {
    element.setPointerCapture(pointerId);
    return true;
  } catch {
    return false;
  }
}

export function useHold(onRelease: () => void) {
  const held = useRef(false);
  const clickPending = useRef(false);
  const captured = useRef(false);
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
    captured.current = false;
    end();
  };

  const onPointerEnd = () => {
    captured.current = false;
    end();
  };

  const handlers = (press: () => void) => ({
    onPointerDown: (event: PointerEvent) => {
      if (event.button !== 0) return;
      clickPending.current = true;
      captured.current = capture(event.currentTarget, event.pointerId);
      begin(press);
    },
    onPointerUp: onPointerEnd,
    onPointerCancel: abandon,
    onLostPointerCapture: onPointerEnd,
    onPointerLeave: () => {
      if (!captured.current) abandon();
    },
    onBlur: abandon,
    onClick: () => {
      // A click while held is a key repeat; the hold ends on key up, not here.
      if (held.current) return;
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
      if (!event.repeat) begin(press);
    },
    onKeyUp: (event: KeyboardEvent) => {
      if (!isActivation(event)) return;
      event.preventDefault();
      end();
    },
  });

  return { begin, end, handlers };
}

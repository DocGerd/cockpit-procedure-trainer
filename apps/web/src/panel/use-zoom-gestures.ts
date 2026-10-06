import { useEffect, useRef } from 'react';
import type { FocusEvent, PointerEvent, RefObject } from 'react';
import { clampZoom, panned, pinched, pinchSample, revealed, sameZoom } from './zoom';
import type { PinchSample, Point, ZoomState } from './zoom';

/** A drag that starts on one of these operates it; only a drag on bare panel pans. */
const OPERABLE =
  '[data-kind="control"], button, a[href], input, select, textarea, [role="slider"], [role="radiogroup"], [role="radio"], [role="button"], [role="switch"]';

/** Marks an element, and everything inside it, as not blocking a pan even where it matches `OPERABLE`. */
const PAN_THROUGH = '[data-pan-through]';

type Tracked = { x: number; y: number; target: Element; operating: boolean };

type Gesture =
  | { kind: 'pan'; id: number; from: Point; start: ZoomState }
  | { kind: 'pinch'; ids: readonly [number, number]; from: PinchSample; start: ZoomState };

export type ZoomTarget = {
  readonly zoom: ZoomState;
  apply(next: ZoomState): void;
};

const gestures = (event: PointerEvent) => event.pointerType !== 'mouse';

const focusVisible = (element: Element) => {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
};

function cancelPress(tracked: Tracked, pointerId: number) {
  const init = { bubbles: true, pointerId, pointerType: 'touch' };
  tracked.target.dispatchEvent(
    typeof PointerEvent === 'function'
      ? new PointerEvent('pointercancel', init)
      : new Event('pointercancel', init),
  );
}

/**
 * Pinch zoom and one-finger pan on `viewport` with pointer events. A second finger takes over from
 * a control the first one is operating by cancelling that press first.
 */
export function useZoomGestures(viewport: RefObject<HTMLElement | null>, target: ZoomTarget) {
  const latest = useRef(target.zoom);
  latest.current = target.zoom;
  const apply = useRef(target.apply);
  apply.current = target.apply;

  const pointers = useRef(new Map<number, Tracked>());
  const gesture = useRef<Gesture | undefined>(undefined);
  const cancelling = useRef(false);
  const lastType = useRef('');

  const origin = (): { left: number; top: number; size: { width: number; height: number } } => {
    const rect = viewport.current?.getBoundingClientRect();
    return {
      left: rect?.left ?? 0,
      top: rect?.top ?? 0,
      size: { width: rect?.width ?? 0, height: rect?.height ?? 0 },
    };
  };

  const local = (tracked: Tracked): Point => {
    const { left, top } = origin();
    return { x: tracked.x - left, y: tracked.y - top };
  };

  function commit(next: ZoomState) {
    latest.current = next;
    apply.current(next);
  }

  function regroup(afterPinch: boolean) {
    const entries = [...pointers.current.entries()];
    const [first, second] = entries;
    if (first && second) {
      gesture.current = {
        kind: 'pinch',
        ids: [first[0], second[0]],
        from: pinchSample(local(first[1]), local(second[1])),
        start: latest.current,
      };
      return;
    }
    if (first && afterPinch) first[1].operating = false;
    gesture.current =
      first && !first[1].operating
        ? { kind: 'pan', id: first[0], from: local(first[1]), start: latest.current }
        : undefined;
  }

  function onPointerDownCapture(event: PointerEvent) {
    lastType.current = event.pointerType;
    if (!gestures(event)) return;
    const live = pointers.current;
    for (const [id, tracked] of live) if (!tracked.target.isConnected) live.delete(id);

    const next = event.target instanceof Element ? event.target : (viewport.current ?? undefined);
    if (!next) return;
    const joining = live.size > 0;
    if (joining) {
      cancelling.current = true;
      try {
        for (const [id, tracked] of live) {
          if (!tracked.operating) continue;
          tracked.operating = false;
          cancelPress(tracked, id);
        }
      } finally {
        cancelling.current = false;
      }
      event.stopPropagation();
    }
    live.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      target: next,
      operating: !joining && next.closest(OPERABLE) !== null && next.closest(PAN_THROUGH) === null,
    });
    regroup(false);
  }

  function onPointerMove(event: PointerEvent) {
    const tracked = pointers.current.get(event.pointerId);
    if (!tracked) return;
    tracked.x = event.clientX;
    tracked.y = event.clientY;
    const current = gesture.current;
    if (!current) return;
    const { size } = origin();
    if (current.kind === 'pinch') {
      const [a, b] = current.ids.map((id) => pointers.current.get(id));
      if (!a || !b || !current.ids.includes(event.pointerId)) return;
      commit(pinched(current.start, current.from, pinchSample(local(a), local(b)), size));
    } else if (current.id === event.pointerId) {
      const at = local(tracked);
      commit(panned(current.start, { x: at.x - current.from.x, y: at.y - current.from.y }, size));
    }
  }

  function onPointerEnd(event: PointerEvent) {
    if (cancelling.current) return;
    if (!pointers.current.delete(event.pointerId)) return;
    regroup(gesture.current?.kind === 'pinch');
  }

  function onFocus(event: FocusEvent) {
    const focused = event.target;
    if (!(focused instanceof Element) || !focusVisible(focused)) return;
    const { left, top, size } = origin();
    const rect = focused.getBoundingClientRect();
    const next = revealed(
      latest.current,
      {
        left: rect.left - left,
        top: rect.top - top,
        right: rect.right - left,
        bottom: rect.bottom - top,
      },
      size,
    );
    if (!sameZoom(next, latest.current)) commit(next);
  }

  useEffect(() => {
    const refit = () => {
      const fitted = clampZoom(latest.current, origin().size);
      if (!sameZoom(fitted, latest.current)) commit(fitted);
    };
    window.addEventListener('resize', refit);
    return () => window.removeEventListener('resize', refit);
  }, []);

  return {
    onPointerDownCapture,
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
    onFocus,
    onContextMenu: (event: { preventDefault(): void }) => {
      if (lastType.current === 'touch' || lastType.current === 'pen') event.preventDefault();
    },
  };
}

import { springsBack } from '@cpt/core';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useCurrentTarget } from '../checklist';
import { useDock } from '../devices/dock-state';
import { useActiveView } from '../panel/active-view';
import { useReveal } from '../panel/panel-zoom';
import type { PanelBox, PanelRects } from '../panel/rects';
import { useSessionState, useTrainer } from '../trainer';
import { ControlDetails } from './ControlDetails';
import { useExploreState, useExploreStore } from './explore-state';
import { installOf, targetBox, targetInstall, targetKey, targetView } from './target';
import './modes.css';

export type PanelOverlayProps = { viewId: string; rects: PanelRects };

const boxStyle = (box: PanelBox): CSSProperties => ({
  left: `${box.left}%`,
  top: `${box.top}%`,
  width: `${box.width}%`,
  height: `${box.height}%`,
});

const FOCUSABLE = 'button:not([tabindex="-1"]), [tabindex="0"], input, select, textarea';

/** The focusable widget at a placement in the same zoom layer as `layer`. */
function widgetAt(layer: HTMLElement | null, placementId: string | undefined) {
  if (placementId === undefined) return undefined;
  const placements = layer?.parentElement?.querySelectorAll<HTMLElement>('[data-placement]');
  const placement = [...(placements ?? [])].find(
    (element) => element.dataset.placement === placementId,
  );
  return placement?.querySelector<HTMLElement>(FOCUSABLE) ?? undefined;
}

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
const motionQuery = () =>
  typeof window.matchMedia === 'function' ? window.matchMedia(reducedMotionQuery) : undefined;

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (listener) => {
      const query = motionQuery();
      query?.addEventListener('change', listener);
      return () => query?.removeEventListener('change', listener);
    },
    () => motionQuery()?.matches ?? false,
  );
}

/** The control the pilot moved off the current item, until it is back where it stood. */
function useStrayControl(): string | undefined {
  return useSessionState((session) => {
    const checklist = session.checklist();
    const latest = checklist?.deviations.at(-1);
    if (!checklist || checklist.done || latest?.itemIndex !== checklist.current) return undefined;
    if (latest.kind !== 'unexpected-control' && latest.kind !== 'out-of-order') return undefined;
    const { controlId, from, position } = latest;
    if (controlId === undefined || from === undefined || position === undefined) return undefined;
    if (springsBack(checklist.controls[controlId], position)) return undefined;
    return session.state().controls[controlId] === from ? undefined : controlId;
  });
}

function GuidedOverlay({ viewId, rects }: { viewId: string; rects: PanelRects }) {
  const { aircraft } = useTrainer();
  const target = useCurrentTarget();
  const stray = useStrayControl();
  const strayBox = stray === undefined ? undefined : targetBox(rects, { control: stray });
  const item = useSessionState((session) => session.checklist()?.current);
  const reducedMotion = useReducedMotion();
  const active = useActiveView();
  const latest = useRef(active);
  latest.current = active;
  const layer = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const focusPending = useRef(false);
  const reveal = useReveal();
  const revealRing = useRef(reveal);
  revealRing.current = reveal;

  const key = target && targetKey(target);
  const inDock = useDock()?.available === true && target && targetInstall(aircraft, target);
  // A device that opens in the dock needs no view of its own, so the pilot's view stays.
  const view = target && !inDock ? targetView(aircraft, target) : undefined;
  const previousView = useRef(view);
  const own = useRef(viewId);
  own.current = viewId;
  useEffect(() => {
    if (view !== undefined && !latest.current.visible(view)) {
      focusPending.current = true;
      latest.current.setView(view);
    } else if (latest.current.combined && view === own.current && previousView.current !== view) {
      focusPending.current = true;
    }
    previousView.current = view;
  }, [key, item, view]);

  const box = target && targetBox(rects, target);
  const shown = box !== undefined;
  useEffect(() => {
    if (shown && ring.current) revealRing.current(ring.current);
  }, [key, item, shown]);

  const focusControl = target && 'control' in target ? target.control : undefined;
  useEffect(() => {
    if (!focusPending.current || viewId !== view) return;
    focusPending.current = false;
    if (focusControl === undefined) return;
    (
      widgetAt(layer.current, focusControl) ?? widgetAt(layer.current, installOf(focusControl))
    )?.focus();
  }, [viewId, view, focusControl, key, item]);

  return (
    <div ref={layer} className="modes-overlay" data-modes-overlay="">
      {box && (
        <div
          ref={ring}
          className="modes-outline"
          data-outline="target"
          data-pulse={reducedMotion ? undefined : 'true'}
          style={boxStyle(box)}
        />
      )}
      {strayBox && (
        <div className="modes-outline" data-outline="stray" style={boxStyle(strayBox)} />
      )}
    </div>
  );
}

function ExploreOverlay({ rects }: { rects: PanelRects }) {
  const { aircraft } = useTrainer();
  const store = useExploreStore();
  const { operate, selected } = useExploreState();
  const anchor = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const selectedBox = selected === undefined ? undefined : targetBox(rects, { control: selected });

  return (
    <div ref={layer} className="modes-overlay" data-modes-overlay="">
      {!operate &&
        Object.entries(rects.controls).map(([id, box]) => {
          const control = aircraft.controls[id];
          return (
            control && (
              // The widget underneath is the one assistive technology sees, so it takes the focus.
              <button
                key={id}
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                className="modes-hit"
                data-hit={id}
                data-pan-through=""
                style={boxStyle(box)}
                onClick={() => {
                  widgetAt(layer.current, id)?.focus({ preventScroll: true });
                  store.select(id);
                }}
              />
            )
          );
        })}
      {selected !== undefined && selectedBox && (
        <>
          <div
            ref={anchor}
            className="modes-outline"
            data-outline="selected"
            style={boxStyle(selectedBox)}
          />
          <ControlDetails
            key={selected}
            controlId={selected}
            anchor={anchor}
            onClose={() => store.select(undefined)}
          />
        </>
      )}
    </div>
  );
}

/** Draws the mode's accent on the panel: the Guided target, or the control selected in Free explore. */
export const PanelOverlay: (props: PanelOverlayProps) => ReactNode = ({ viewId, rects }) => {
  const { mode } = useTrainer();
  const store = useExploreStore();

  useEffect(() => {
    if (mode !== 'explore') store.select(undefined);
  }, [mode, store]);

  if (mode === 'guided') return <GuidedOverlay viewId={viewId} rects={rects} />;
  if (mode === 'explore') return <ExploreOverlay rects={rects} />;
  return null;
};

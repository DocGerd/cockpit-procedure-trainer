import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useCurrentTarget, useFlowTargets, useStray } from '../checklist';
import { useDock } from '../devices/dock-state';
import { useActiveView } from '../panel/active-view';
import { useReveal } from '../panel/panel-zoom';
import type { PanelBox, PanelRects } from '../panel/rects';
import { useSessionState, useTrainer } from '../trainer';
import { ControlDetails } from './ControlDetails';
import { useExploreState, useExploreStore } from './explore-state';
import { useTargetCued } from './guided-install';
import { lockHolder, useLockNotice } from './lock-notice';
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

/**
 * Guided rings every step; Practice rings only an item the pilot had shown with Show me. A flow
 * rings all its open targets at once, each numbered in scan order.
 */
function TargetOverlay({ viewId, rects }: { viewId: string; rects: PanelRects }) {
  const { aircraft, mode } = useTrainer();
  const target = useCurrentTarget();
  const flow = useFlowTargets();
  const stray = useStray();
  const strayBox = stray === undefined ? undefined : targetBox(rects, { control: stray });
  const item = useSessionState((session) => session.checklist()?.current);
  const practice = mode === 'practice';
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
    // A flow has no order, so the pilot stays on a view that still holds one of its open targets.
    const scanning = flow.some(({ control }) => {
      const at = targetView(aircraft, { control });
      return at !== undefined && latest.current.visible(at);
    });
    if (view !== undefined && !latest.current.visible(view) && !scanning) {
      focusPending.current = true;
      latest.current.setView(view);
    } else if (latest.current.combined && view === own.current && previousView.current !== view) {
      focusPending.current = true;
    }
    previousView.current = view;
  }, [key, item, view, flow, aircraft]);

  const box = target && targetBox(rects, target);
  const shown = box !== undefined;
  const scan = flow.flatMap(({ index, control }) => {
    const at = targetBox(rects, { control });
    return at ? [{ index, box: at }] : [];
  });
  const pulse = reducedMotion ? undefined : practice ? 'once' : 'true';
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
      {flow.length > 0
        ? scan.map(({ index, box: at }) => (
            <div
              key={index}
              ref={index === item ? ring : undefined}
              className="modes-outline"
              data-outline="target"
              data-scan={index + 1}
              data-pulse={pulse}
              style={boxStyle(at)}
            >
              <span className="modes-scan" aria-hidden="true">
                {index + 1}
              </span>
            </div>
          ))
        : box && (
            <div
              ref={ring}
              className="modes-outline"
              data-outline="target"
              data-pulse={pulse}
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

/** Rings the control that holds a refused move, next to it, while the header names it. */
function LockOverlay({ rects }: { rects: PanelRects }) {
  const { aircraft, session } = useTrainer();
  const notice = useLockNotice();
  const reducedMotion = useReducedMotion();
  const holder = notice && lockHolder(aircraft, session.state().controls, notice.controlId);
  const box = holder === undefined ? undefined : targetBox(rects, { control: holder });
  if (!notice || !box) return null;
  return (
    <div className="modes-overlay" data-modes-overlay="">
      <div
        key={notice.serial}
        className="modes-outline"
        data-outline="lock"
        data-pulse={reducedMotion ? undefined : 'once'}
        style={boxStyle(box)}
      />
    </div>
  );
}

function ModeOverlay({ viewId, rects }: PanelOverlayProps) {
  const { mode } = useTrainer();
  const store = useExploreStore();
  const cued = useTargetCued();

  useEffect(() => {
    if (mode !== 'explore') store.select(undefined);
  }, [mode, store]);

  if (mode === 'explore') return <ExploreOverlay rects={rects} />;
  return cued ? <TargetOverlay viewId={viewId} rects={rects} /> : null;
}

/** Draws the mode's accent on the panel: a step target, or the control selected in Free explore. */
export const PanelOverlay: (props: PanelOverlayProps) => ReactNode = ({ viewId, rects }) => (
  <>
    <ModeOverlay viewId={viewId} rects={rects} />
    <LockOverlay rects={rects} />
  </>
);

import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useCurrentTarget } from '../checklist';
import { format, useLocalize, useMessages } from '../i18n';
import { useActiveView } from '../panel/active-view';
import type { PanelBox, PanelRects } from '../panel/rects';
import { useSessionState, useTrainer } from '../trainer';
import { ControlDetails } from './ControlDetails';
import { useExploreState, useExploreStore } from './explore-state';
import { messages } from './messages';
import { targetBox, targetKey, targetView } from './target';
import './modes.css';

export type PanelOverlayProps = { viewId: string; rects: PanelRects };

const boxStyle = (box: PanelBox): CSSProperties => ({
  left: `${box.left}%`,
  top: `${box.top}%`,
  width: `${box.width}%`,
  height: `${box.height}%`,
});

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

function GuidedOverlay({ rects }: { rects: PanelRects }) {
  const { aircraft } = useTrainer();
  const target = useCurrentTarget();
  const item = useSessionState((session) => session.checklist()?.current);
  const reducedMotion = useReducedMotion();
  const active = useActiveView();
  const latest = useRef(active);
  latest.current = active;

  const key = target && targetKey(target);
  const view = target && targetView(aircraft, target);
  useEffect(() => {
    if (view !== undefined && view !== latest.current.viewId) latest.current.setView(view);
  }, [key, item, view]);

  const box = target && targetBox(rects, target);
  if (!box) return null;
  return (
    <div className="modes-overlay" data-modes-overlay="">
      <div
        className="modes-outline"
        data-outline="target"
        data-pulse={reducedMotion ? undefined : 'true'}
        style={boxStyle(box)}
      />
    </div>
  );
}

function ExploreOverlay({ rects }: { rects: PanelRects }) {
  const text = useMessages(messages);
  const localize = useLocalize();
  const { aircraft } = useTrainer();
  const store = useExploreStore();
  const { operate, selected } = useExploreState();
  const anchor = useRef<HTMLDivElement>(null);
  const selectedBox = selected === undefined ? undefined : rects.controls[selected];

  return (
    <div className="modes-overlay" data-modes-overlay="">
      {!operate &&
        Object.entries(rects.controls).map(([id, box]) => {
          const control = aircraft.controls[id];
          return (
            control && (
              <button
                key={id}
                type="button"
                tabIndex={-1}
                className="modes-hit"
                aria-label={format(text.showDetails, { control: localize(control.name) })}
                style={boxStyle(box)}
                onClick={() => store.select(id)}
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
export const PanelOverlay: (props: PanelOverlayProps) => ReactNode = ({ rects }) => {
  const { mode } = useTrainer();
  const store = useExploreStore();

  useEffect(() => {
    if (mode !== 'explore') store.select(undefined);
  }, [mode, store]);

  if (mode === 'guided') return <GuidedOverlay rects={rects} />;
  if (mode === 'explore') return <ExploreOverlay rects={rects} />;
  return null;
};

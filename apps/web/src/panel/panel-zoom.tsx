import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { NO_ZOOM } from './zoom';
import type { Point, ZoomState } from './zoom';

export type PanelZoom = {
  readonly scale: number;
  readonly offset: Point;
  reset(): void;
};

const NOT_ZOOMABLE: PanelZoom = { ...NO_ZOOM, reset: () => {} };

export const PanelZoomContext = createContext<PanelZoom>(NOT_ZOOMABLE);

/** The panel's zoom, for anything inside `PanelArea`. Outside it the panel is never zoomed. */
export function usePanelZoom(): PanelZoom {
  return useContext(PanelZoomContext);
}

const NO_REVEAL = (): void => {};

const PanelRevealContext = createContext<(element: Element) => void>(NO_REVEAL);
export const PanelRevealProvider = PanelRevealContext.Provider;

/** Pans the zoomed panel just far enough to bring an element on it into view. A no-op outside `PanelArea`. */
export function useReveal(): (element: Element) => void {
  return useContext(PanelRevealContext);
}

/** Zoom state that starts over whenever `resetKey` changes, e.g. on another view. */
export function useZoomState(resetKey: string) {
  const [stored, setStored] = useState<{ key: string; zoom: ZoomState }>({
    key: resetKey,
    zoom: NO_ZOOM,
  });
  const zoom = stored.key === resetKey ? stored.zoom : NO_ZOOM;
  const apply = useCallback(
    (next: ZoomState) => setStored({ key: resetKey, zoom: next }),
    [resetKey],
  );
  const reset = useCallback(() => setStored({ key: resetKey, zoom: NO_ZOOM }), [resetKey]);
  const value = useMemo<PanelZoom>(
    () => ({ scale: zoom.scale, offset: zoom.offset, reset }),
    [zoom, reset],
  );
  return { zoom, apply, reset, value };
}

/** Inputs of the transform in `panel.css`. */
export const zoomStyle = (zoom: ZoomState) =>
  ({
    '--panel-scale': zoom.scale,
    '--panel-x': zoom.offset.x,
    '--panel-y': zoom.offset.y,
  }) as CSSProperties;

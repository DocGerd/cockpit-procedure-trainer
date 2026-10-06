/** Scale 1 is the contain-fit of `fit.ts`; the panel never zooms out past it. */
export const MIN_SCALE = 1;
export const MAX_SCALE = 4;

export type Point = { readonly x: number; readonly y: number };
export type Size = { readonly width: number; readonly height: number };

/** The panel's content box is drawn as `translate(offset) scale(scale)` from its top-left corner. */
export type ZoomState = { readonly scale: number; readonly offset: Point };

export const NO_ZOOM: ZoomState = { scale: 1, offset: { x: 0, y: 0 } };

export const isZoomed = (zoom: ZoomState) =>
  zoom.scale !== NO_ZOOM.scale || zoom.offset.x !== 0 || zoom.offset.y !== 0;

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** Keeps the scale in bounds and the zoomed content covering the whole viewport. */
export function clampZoom(zoom: ZoomState, viewport: Size): ZoomState {
  const scale = clamp(zoom.scale, MIN_SCALE, MAX_SCALE);
  return {
    scale,
    offset: {
      x: clamp(zoom.offset.x, viewport.width * (1 - scale), 0),
      y: clamp(zoom.offset.y, viewport.height * (1 - scale), 0),
    },
  };
}

export function panned(start: ZoomState, delta: Point, viewport: Size): ZoomState {
  return clampZoom(
    { scale: start.scale, offset: { x: start.offset.x + delta.x, y: start.offset.y + delta.y } },
    viewport,
  );
}

export type PinchSample = { readonly center: Point; readonly distance: number };

export const pinchSample = (a: Point, b: Point): PinchSample => ({
  center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
  distance: Math.hypot(a.x - b.x, a.y - b.y),
});

/** Scales by the change of finger distance, keeping the content point first under the fingers' centre under it. */
export function pinched(
  start: ZoomState,
  from: PinchSample,
  to: PinchSample,
  viewport: Size,
): ZoomState {
  if (from.distance <= 0) return start;
  const scale = clamp((start.scale * to.distance) / from.distance, MIN_SCALE, MAX_SCALE);
  const anchor = {
    x: (from.center.x - start.offset.x) / start.scale,
    y: (from.center.y - start.offset.y) / start.scale,
  };
  return clampZoom(
    { scale, offset: { x: to.center.x - anchor.x * scale, y: to.center.y - anchor.y * scale } },
    viewport,
  );
}

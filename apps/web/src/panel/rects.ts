import type { Aircraft, Rect } from '@cpt/core';

/** Percent of the panel image box. */
export type PanelBox = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

export type PanelRects = {
  readonly controls: Readonly<Record<string, PanelBox>>;
  readonly indicators: Readonly<Record<string, PanelBox>>;
  /** Keyed by install id, for the devices installed in this view. */
  readonly devices: Readonly<Record<string, PanelBox>>;
};

export type ViewPlacements = {
  readonly controls: Readonly<Record<string, Rect>>;
  readonly indicators: Readonly<Record<string, Rect>>;
  readonly devices: Readonly<Record<string, Rect>>;
};

/** The coordinate space of a background; `x` and `y` are its origin, e.g. an SVG viewBox's min-x and min-y. */
export type ImageSize = {
  readonly x?: number;
  readonly y?: number;
  readonly width: number;
  readonly height: number;
};

type Placed = { readonly rect: Rect } | undefined;

const rectsOf = (placements: Readonly<Record<string, Placed>> | undefined) =>
  Object.fromEntries(
    Object.entries(placements ?? {}).flatMap(([id, placement]) =>
      placement ? [[id, placement.rect] as const] : [],
    ),
  );

export function viewPlacements(
  aircraft: Pick<Aircraft, 'views' | 'devices'>,
  viewId: string,
): ViewPlacements {
  const view = aircraft.views[viewId];
  const installs = Object.entries(aircraft.devices ?? {}).filter(
    ([, install]) => install.view === viewId,
  );
  return {
    controls: rectsOf(view?.controls),
    indicators: rectsOf(view?.indicators),
    devices: rectsOf(Object.fromEntries(installs.map(([id, install]) => [id, install.placement]))),
  };
}

const ASPECT_WITHOUT_PLACEMENTS: ImageSize = { width: 16, height: 9 };

/** The image box to use while the background's own size is unknown, e.g. when it failed to load. */
export function placementExtent(placements: ViewPlacements): ImageSize {
  const rects = [placements.controls, placements.indicators, placements.devices].flatMap((group) =>
    Object.values(group),
  );
  const width = Math.max(0, ...rects.map((rect) => rect.x + rect.w));
  const height = Math.max(0, ...rects.map((rect) => rect.y + rect.h));
  return width > 0 && height > 0 ? { width, height } : ASPECT_WITHOUT_PLACEMENTS;
}

export const toBox = (rect: Rect, size: ImageSize): PanelBox => ({
  left: ((rect.x - (size.x ?? 0)) / size.width) * 100,
  top: ((rect.y - (size.y ?? 0)) / size.height) * 100,
  width: (rect.w / size.width) * 100,
  height: (rect.h / size.height) * 100,
});

const scale = (rects: Readonly<Record<string, Rect>>, size: ImageSize) =>
  Object.fromEntries(Object.entries(rects).map(([id, rect]) => [id, toBox(rect, size)]));

export const panelRects = (placements: ViewPlacements, size: ImageSize): PanelRects => ({
  controls: scale(placements.controls, size),
  indicators: scale(placements.indicators, size),
  devices: scale(placements.devices, size),
});

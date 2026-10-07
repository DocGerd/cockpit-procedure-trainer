import { isUsableRect } from '@cpt/core';
import type { Aircraft, CockpitCell } from '@cpt/core';

/** The space, in CSS px, the cockpit may fill. */
export type CockpitRegion = { readonly width: number; readonly height: number };

/** A view's cell in the combined layout, in CSS px from the top-left of the cockpit box. */
export type CombinedCell = {
  readonly viewId: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  /** The width the view renders at, contain-fit inside the cell. */
  readonly fitWidth: number;
};

/** The device dock's cell in the combined layout, in CSS px from the top-left of the cockpit box. */
export type CombinedDock = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

export type CockpitLayoutChoice =
  | { readonly kind: 'tabs' }
  | {
      readonly kind: 'combined';
      readonly scale: number;
      readonly width: number;
      readonly height: number;
      readonly cells: readonly CombinedCell[];
      /** Absent when the arrangement declares no dock. */
      readonly dock?: CombinedDock;
    };

const TABS: CockpitLayoutChoice = { kind: 'tabs' };

const positive = (value: number) => Number.isFinite(value) && value > 0;

/**
 * Combined when every view, contain-fit in its cell at the arrangement's uniform scale, and the
 * dock, if declared, is at least as wide as its declared floor; tabs otherwise. Pure arithmetic:
 * nothing is rendered to decide.
 */
export function chooseLayout(
  aircraft: Pick<Aircraft, 'cockpit' | 'views'>,
  region: CockpitRegion,
): CockpitLayoutChoice {
  const { cockpit } = aircraft;
  if (!cockpit || !positive(region.width) || !positive(region.height)) return TABS;
  if (!positive(cockpit.size.width) || !positive(cockpit.size.height)) return TABS;

  const scale = Math.min(region.width / cockpit.size.width, region.height / cockpit.size.height);
  if (Object.keys(aircraft.views).some((viewId) => !Object.hasOwn(cockpit.views, viewId))) {
    return TABS;
  }

  const cells: CombinedCell[] = [];
  for (const [viewId, cell] of Object.entries<CockpitCell>(cockpit.views)) {
    const view = aircraft.views[viewId];
    if (!view || !isUsableRect(cell?.rect)) return TABS;
    const width = cell.rect.w * scale;
    const height = cell.rect.h * scale;
    const own = view.size ?? { width: cell.rect.w, height: cell.rect.h };
    const fitWidth = Math.min(width, height * (own.width / own.height));
    if (!(fitWidth >= cell.minWidth)) return TABS;
    cells.push({
      viewId,
      left: cell.rect.x * scale,
      top: cell.rect.y * scale,
      width,
      height,
      fitWidth,
    });
  }

  let dock: CombinedDock | undefined;
  if (cockpit.dock !== undefined) {
    const cell = cockpit.dock;
    if (!isUsableRect(cell.rect)) return TABS;
    const width = cell.rect.w * scale;
    if (!(width >= cell.minWidth)) return TABS;
    dock = {
      left: cell.rect.x * scale,
      top: cell.rect.y * scale,
      width,
      height: cell.rect.h * scale,
    };
  }
  return {
    kind: 'combined',
    scale,
    width: cockpit.size.width * scale,
    height: cockpit.size.height * scale,
    cells,
    ...(dock && { dock }),
  };
}

/** The outside-view strip as the page lays it out unfolded, and what folding it may take, in CSS px. */
export type OutsideStrip = {
  /** The strip's full height, borders included. */
  readonly natural: number;
  /** The least height the strip folds to. */
  readonly min: number;
  /** How far the folded strip is pulled toward the cockpit, closing part of the gap between them. */
  readonly pull: number;
};

/**
 * The height the outside-view strip folds to so the cockpit reaches combined, or undefined when it
 * does so with the strip unfolded, or not even with the strip folded as far as it goes. `region` is
 * the cockpit region the unfolded strip leaves, so the answer never depends on the strip's own
 * current height. Found by asking `chooseLayout`, which keeps the two rules in step.
 */
export function outsideViewBand(
  aircraft: Pick<Aircraft, 'cockpit' | 'views'>,
  region: CockpitRegion,
  strip: OutsideStrip,
): number | undefined {
  if (!(strip.natural > strip.min) || chooseLayout(aircraft, region).kind === 'combined') {
    return undefined;
  }
  const gives = (give: number) =>
    chooseLayout(aircraft, { width: region.width, height: region.height + give }).kind ===
    'combined';
  let low = strip.pull + 1;
  let high = strip.natural - strip.min + strip.pull;
  if (!gives(high)) return undefined;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (gives(middle)) high = middle;
    else low = middle + 1;
  }
  return strip.natural - (low - strip.pull);
}

/** The height the cockpit region gains when the strip folds to `band`. */
export const foldedGain = (strip: OutsideStrip, band: number) => strip.natural - band + strip.pull;

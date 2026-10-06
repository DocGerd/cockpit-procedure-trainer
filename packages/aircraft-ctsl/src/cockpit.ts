import type { CockpitCell, CockpitLayout } from '@cpt/core';
import type { ViewId } from './views';

const cell = (x: number, y: number, w: number, h: number, minWidth: number): CockpitCell => ({
  rect: { x, y, w, h },
  minWidth,
});

// Left seat: the panel ahead with the GPS to its right, the centre field and console below the
// panel, the radio stack under the GPS. Cell sizes follow each view's legibility floor.
export const cockpit = {
  size: { width: 1396, height: 596 },
  views: {
    panel: cell(130, 0, 677, 249, 677),
    gps: cell(855, 0, 541, 203, 541),
    centre: cell(0, 265, 436, 327, 436),
    console: cell(452, 265, 486, 292, 486),
    radios: cell(954, 265, 442, 331, 442),
  },
} as const satisfies CockpitLayout<ViewId>;

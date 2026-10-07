import type { CockpitCell, CockpitLayout } from '@cpt/core';
import type { ViewId } from './views';

const cell = (x: number, y: number, w: number, h: number, minWidth: number): CockpitCell => ({
  rect: { x, y, w, h },
  minWidth,
});

// Left seat: the panel ahead with the device dock under it, the centre field and the console
// stacked to its right. Cell sizes follow the HD cockpit region; each minWidth is the cell's
// floor: legibility for a view, the installed device floors for the dock.
export const cockpit = {
  size: { width: 1519, height: 758 },
  views: {
    panel: cell(0, 0, 983, 362, 950),
    centre: cell(999, 0, 520, 390, 436),
    console: cell(999, 406, 520, 312, 486),
  },
  dock: cell(0, 378, 983, 380, 480),
} as const satisfies CockpitLayout<ViewId>;

import type { CockpitCell, CockpitLayout } from '@cpt/core';
import type { ViewId } from './views';

const cell = (x: number, y: number, w: number, h: number, minWidth: number): CockpitCell => ({
  rect: { x, y, w, h },
  minWidth,
});

// Left seat: the panel ahead with the GPS to its right, the centre field and console below the
// panel, the radio stack under the GPS. Cell sizes follow each view's legibility floor.
export const cockpit = {
  size: { width: 1883, height: 715 },
  views: {
    panel: cell(302, 0, 677, 249, 677),
    gps: cell(1319, 0, 541, 203, 541),
    centre: cell(0, 265, 600, 450, 600),
    console: cell(616, 265, 664, 398, 664),
    radios: cell(1296, 265, 587, 440, 587),
  },
} as const satisfies CockpitLayout<ViewId>;

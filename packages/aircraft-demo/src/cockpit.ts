import type { CockpitCell, CockpitLayout } from '@cpt/core';

const cell = (x: number, y: number, w: number, h: number, minWidth: number): CockpitCell => ({
  rect: { x, y, w, h },
  minWidth,
});

// Left seat: the panel with the device dock under it, the console to the right. Cell sizes follow
// each view's legibility floor; the dock has room for the widest installed device and the close
// button, and runs under the console's column where the console is shorter than the panel.
export const cockpit = {
  size: { width: 1168, height: 640 },
  views: {
    panel: cell(0, 0, 649, 363, 649),
    console: cell(665, 0, 503, 352, 503),
  },
  dock: cell(0, 379, 700, 260, 700),
} as const satisfies CockpitLayout<'panel' | 'console'>;

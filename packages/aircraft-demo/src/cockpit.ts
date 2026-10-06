import type { CockpitCell, CockpitLayout } from '@cpt/core';

const cell = (x: number, y: number, w: number, h: number, minWidth: number): CockpitCell => ({
  rect: { x, y, w, h },
  minWidth,
});

// Left seat: the panel above the console, the radio stack to the right. Cell sizes follow each
// view's legibility floor.
export const cockpit = {
  size: { width: 1300, height: 673 },
  views: {
    panel: cell(0, 0, 649, 305, 649),
    avionics: cell(665, 122, 635, 429, 635),
    console: cell(73, 321, 503, 352, 503),
  },
} as const satisfies CockpitLayout<'panel' | 'console' | 'avionics'>;

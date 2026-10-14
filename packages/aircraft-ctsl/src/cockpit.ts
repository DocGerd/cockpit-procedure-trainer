import type { CockpitCell, CockpitLayout } from '@cpt/core';
import type { ViewId } from './views';

const cell = (x: number, y: number, w: number, h: number, minWidth: number): CockpitCell => ({
  rect: { x, y, w, h },
  minWidth,
});

// Left seat: the panel ahead with its three upper plates, the centre column hanging below the
// middle plate as in the aircraft, offset toward the pilot (intake §3.9.6). The dock takes the
// pilot's knee space left of the centre column. The console belongs below the centre field; at HD
// height it only fits beside it, on the right toward the throttle hand, running aft down to the
// rescue handle at the bulkhead. Cell sizes follow the HD cockpit region; each minWidth is the
// cell's floor: legibility and touch targets for a view, the installed device floors for the dock.
export const cockpit = {
  size: { width: 1519, height: 758 },
  views: {
    panel: cell(194, 0, 1191, 395, 1110),
    centre: cell(524, 411, 463, 347, 436),
    console: cell(1003, 411, 516, 347, 486),
  },
  dock: cell(0, 411, 508, 347, 480),
} as const satisfies CockpitLayout<ViewId>;

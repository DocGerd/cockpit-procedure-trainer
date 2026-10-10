import type { CockpitCell, CockpitLayout } from '@cpt/core';
import type { ViewId } from './views';

const cell = (x: number, y: number, w: number, h: number, minWidth: number): CockpitCell => ({
  rect: { x, y, w, h },
  minWidth,
});

// Left seat: the panel ahead with its three upper fields, the centre column hanging below the
// middle field as in the aircraft (intake §3). The panel sits left of the cockpit's middle so
// that the radio slot at the left of the middle field reaches over the dock, which takes the
// pilot's knee space left of the centre column. The console belongs below the centre field; at HD
// height it only fits beside it, on the right toward the throttle hand, running aft down to the
// rescue handle at the bulkhead. Cell sizes follow the HD cockpit region; each minWidth is the
// cell's floor: legibility for a view, the installed device floors for the dock.
export const cockpit = {
  size: { width: 1519, height: 758 },
  views: {
    panel: cell(120, 0, 1339, 395, 1110),
    centre: cell(524, 411, 463, 347, 436),
    console: cell(1003, 411, 516, 347, 486),
  },
  dock: cell(0, 411, 508, 347, 480),
} as const satisfies CockpitLayout<ViewId>;

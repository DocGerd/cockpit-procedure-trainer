import type { Aircraft } from '@cpt/core';
import type { CurrentTarget } from '../checklist';
import type { PanelBox, PanelRects } from '../panel/rects';

const installOf = (controlId: string) => {
  const dot = controlId.indexOf('.');
  return dot > 0 ? controlId.slice(0, dot) : undefined;
};

export const targetKey = (target: CurrentTarget) =>
  'control' in target ? `control:${target.control}` : `indicator:${target.indicator}`;

/** The view showing the target; a device control shows in its install's view. */
export function targetView(
  aircraft: Pick<Aircraft, 'views' | 'devices'>,
  target: CurrentTarget,
): string | undefined {
  const views = Object.entries(aircraft.views);
  if ('indicator' in target) {
    return views.find(([, view]) => view.indicators?.[target.indicator])?.[0];
  }
  const own = views.find(([, view]) => view.controls?.[target.control])?.[0];
  if (own !== undefined) return own;
  const install = installOf(target.control);
  return install === undefined ? undefined : aircraft.devices?.[install]?.view;
}

/** The target's box in a view's rects; a device control only has its install's box. */
export function targetBox(rects: PanelRects, target: CurrentTarget): PanelBox | undefined {
  if ('indicator' in target) return rects.indicators[target.indicator];
  const own = rects.controls[target.control];
  if (own) return own;
  const install = installOf(target.control);
  return install === undefined ? undefined : rects.devices[install];
}

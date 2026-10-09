import type { ControlDefinition, ControlPosition, Text } from '@cpt/core';

/**
 * A position as a cue names it. A phrase takes its own sentence forms; `restore`, when set, is the
 * imperative to bring the control back to it.
 */
export type NamedPosition = {
  readonly name: string;
  readonly phrase?: true;
  readonly restore?: string;
};

/**
 * A position reads as the panel prints it: its declared legend, else its id in capitals. A
 * position the panel prints nothing for is a phrase, which takes its own sentence forms.
 */
export function positionName(
  control: ControlDefinition | undefined,
  at: ControlPosition,
  localize: (text: Text) => string,
  breaker: { readonly in: string; readonly pulled: string },
): NamedPosition {
  if (typeof at === 'number') return { name: `${Math.round(at * 100)} %` };
  if (control?.kind === 'breaker') return { name: at === 'in' ? breaker.in : breaker.pulled };
  const legend =
    control?.legends && Object.hasOwn(control.legends, at) ? control.legends[at] : undefined;
  if (legend === undefined) return { name: at.toUpperCase() };
  if (typeof legend === 'string') return { name: legend };
  return { name: localize(legend.state), phrase: true, restore: localize(legend.restore) };
}

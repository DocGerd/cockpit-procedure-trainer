import type { ControlDefinition } from '@cpt/core';

export function namedPositions(control: ControlDefinition): readonly string[] {
  return control.positions === 'continuous' ? [] : control.positions;
}

export function springBackOf(
  control: ControlDefinition,
): Readonly<Record<string, string>> | undefined {
  return control.kind === 'rotary' ? control.springBack : undefined;
}

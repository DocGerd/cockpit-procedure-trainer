import type { ControlDefinition, ControlPosition } from './types';

export function isPosition(control: ControlDefinition, position: unknown): boolean {
  return control.positions === 'continuous'
    ? typeof position === 'number' && Number.isFinite(position) && position >= 0 && position <= 1
    : (control.positions as readonly ControlPosition[]).includes(position as ControlPosition);
}

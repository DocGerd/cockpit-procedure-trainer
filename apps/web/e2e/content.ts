import type { Aircraft, ControlDefinition } from '@cpt/core';
import { aircraftRegistry } from '../src/aircraft-registry';

export const aircraft: Aircraft = (() => {
  const found = aircraftRegistry.find((entry) => entry.id === 'demo');
  if (!found) throw new Error('The aircraft registry has no demo aircraft');
  return found;
})();

export function procedure(id: string) {
  const found = aircraft.procedures[id];
  if (!found) throw new Error(`The demo aircraft has no procedure "${id}"`);
  return found;
}

export function control(id: string): ControlDefinition {
  const found = aircraft.controls[id];
  if (!found) throw new Error(`The demo aircraft has no control "${id}"`);
  return found;
}

export function viewOf(controlId: string) {
  const found = Object.values(aircraft.views).find((view) => view.controls?.[controlId]);
  if (!found) throw new Error(`No view places control "${controlId}"`);
  return found;
}

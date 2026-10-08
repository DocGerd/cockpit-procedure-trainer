import { expect, it } from 'vitest';
import { cockpit } from './cockpit';

it('lists the cells in reading order: panel, console', () => {
  expect(Object.keys(cockpit.views)).toEqual(['panel', 'console']);
});

it('places the dock under the panel', () => {
  const { panel } = cockpit.views;
  expect(cockpit.dock.rect.x).toBe(panel.rect.x);
  expect(cockpit.dock.rect.w).toBeGreaterThanOrEqual(panel.rect.w);
  expect(cockpit.dock.rect.y).toBeGreaterThanOrEqual(panel.rect.y + panel.rect.h);
});

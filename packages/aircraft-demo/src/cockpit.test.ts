import { expect, it } from 'vitest';
import { cockpit } from './cockpit';

it('lists the cells in reading order: panel, avionics, console', () => {
  expect(Object.keys(cockpit.views)).toEqual(['panel', 'avionics', 'console']);
});

import { expect, it } from 'vitest';
import { aircraftRegistry } from './aircraft-registry';

it('has unique aircraft ids', () => {
  const ids = aircraftRegistry.map((a) => a.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids).toContain('demo');
});

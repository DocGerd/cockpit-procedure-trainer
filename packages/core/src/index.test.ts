import { expect, it } from 'vitest';
import * as core from './index';
import { CONTRACT_VERSION, defineAircraft } from './index';

it('exposes the contract version', () => {
  expect(CONTRACT_VERSION).toBe(1);
});

it('exports defineAircraft from the barrel', () => {
  expect(defineAircraft).toBeTypeOf('function');
  expect(core.defineAircraft).toBe(defineAircraft);
});

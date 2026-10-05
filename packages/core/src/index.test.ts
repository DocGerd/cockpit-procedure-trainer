import { expect, it } from 'vitest';
import { CONTRACT_VERSION } from './index';

it('exposes the contract version', () => {
  expect(CONTRACT_VERSION).toBe(2);
});

import { CONTRACT_VERSION } from '@cpt/core';
import { expect, it } from 'vitest';
import { demoAircraft } from './index';

it('targets the current contract', () => {
  expect(demoAircraft.contractVersion).toBe(CONTRACT_VERSION);
});

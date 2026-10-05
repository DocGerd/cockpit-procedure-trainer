import { expect, it } from 'vitest';
import { deployEnv } from './deploy-env';

it('is uat only for the exact value uat', () => {
  expect(deployEnv('uat')).toBe('uat');
  expect(deployEnv('prod')).toBe('prod');
  expect(deployEnv(undefined)).toBe('prod');
  expect(deployEnv('UAT ')).toBe('prod');
});

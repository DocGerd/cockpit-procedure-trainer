import { expect, it } from 'vitest';
import { PANEL_KIT_READY } from './index';

it('loads', () => {
  expect(PANEL_KIT_READY).toBe(true);
});

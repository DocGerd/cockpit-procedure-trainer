import { demoAircraft } from '@cpt/aircraft-demo';
import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import { openAircraft } from './legibility';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openAircraft(page, demoAircraft, 'radioAndTransponder');
});

const dock = (page: Page) => page.getByRole('region', { name: 'Device dock' });

test('the demo has no radio view; its two devices mirror in the panel', async ({ page }) => {
  expect(Object.keys(demoAircraft.views)).toEqual(['panel', 'console']);
  await expect(page.getByRole('tablist')).toHaveCount(0);
  const panel = page.locator('[data-view="panel"]');
  await expect(panel.locator('[data-kind="device"] [data-device-mirror]')).toHaveCount(2);
  await expect(page.locator('[data-view="avionics"]')).toHaveCount(0);
});

test('the dock sits under the panel and starts empty', async ({ page }) => {
  const panel = await page.locator('[data-view="panel"]').boundingBox();
  const box = await dock(page).boundingBox();
  if (!panel || !box) throw new Error('no boxes');
  expect(box.y).toBeGreaterThanOrEqual(panel.y + panel.height);
  await expect(dock(page).getByRole('group')).toHaveCount(0);
});

test('a slot docks its device, which operates and swaps with the other', async ({ page }) => {
  const panel = page.locator('[data-view="panel"]');
  const slot = panel.locator('[data-placement="radio"]').getByRole('button');
  const before = (await slot.getAttribute('aria-label')) ?? '';
  await slot.click();
  const radio = dock(page).getByRole('group', { name: 'com', exact: true });
  await expect(radio).toBeVisible();

  await radio.getByRole('button', { name: 'STBY MHz +' }).click();
  await radio.getByRole('button', { name: 'SWAP' }).click();
  await expect(slot).not.toHaveAttribute('aria-label', before);

  await panel.locator('[data-placement="xpdr"]').getByRole('button').click();
  await expect(dock(page).getByRole('group', { name: 'transponder', exact: true })).toBeVisible();
  await expect(dock(page).getByRole('group')).toHaveCount(1);
});

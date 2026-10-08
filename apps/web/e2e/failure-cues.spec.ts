import { ctslAircraft } from '@cpt/aircraft-ctsl';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { openAircraft, showView } from './legibility';
import { copy } from './trainer';

const smokeName = ctslAircraft.outsideCues?.['engineSmoke']?.name.en;
if (smokeName === undefined) throw new Error('The CTSL declares no engine smoke cue');

const smoke = (page: Page) =>
  page.getByRole('region', { name: copy.shell.outsideView }).getByRole('img', { name: smokeName });

const valve = (page: Page) => page.locator('[data-placement="fuelValve"] button');

// The closed valve's handle lies over the key slot; its upper end is clear of the key.
async function tapValve(page: Page) {
  const box = await page.locator('[data-placement="fuelValve"]').boundingBox();
  if (!box) throw new Error('fuelValve is not on screen');
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.2);
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
});

test('ctsl: an engine fire lays smoke over the outside view until the fire is out', async ({
  page,
}) => {
  await openAircraft(page, ctslAircraft, 'engineFire');
  await expect(smoke(page)).toBeVisible();
  await expect
    .poll(() => smoke(page).evaluate((element: HTMLImageElement) => element.naturalWidth))
    .toBeGreaterThan(0);

  await showView(page, ctslAircraft, 'centre', 'en');
  await tapValve(page);
  await expect(valve(page)).toHaveAttribute('aria-label', /: closed$/i);
  await expect(smoke(page)).toBeHidden({ timeout: 20_000 });
});

test('ctsl: a flap control failure darkens the flap readout', async ({ page }) => {
  await openAircraft(page, ctslAircraft, 'flapControlFailure');
  const root = await showView(page, ctslAircraft, 'centre', 'en');
  const readout = root.locator('[data-placement="flapReadout"] [data-widget="digital-readout"]');
  await expect(readout).toBeVisible();
  await expect(readout).not.toHaveAttribute('aria-label', /\d|°/);
  await expect(readout.locator('[data-units]')).toHaveCount(0);
});

import { ctslAircraft } from '@cpt/aircraft-ctsl';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { openAircraft, showView } from './legibility';
import { checklistPane, copy } from './trainer';

const valve = (page: Page) => page.locator('[data-placement="parkingBrakeValve"] button');
const lever = (page: Page) => page.locator('[data-placement="brake"] button');
const leverArt = (page: Page) =>
  page.locator('[data-placement="brake"] [data-moving="travel"] image');
const row = (page: Page, text: string) =>
  checklistPane(page).getByRole('listitem').filter({ hasText: text });
const done = (page: Page, text: string) => row(page, text).getByRole('img', { name: 'Done' });

async function closeValve(page: Page) {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openAircraft(page, ctslAircraft, 'shutdown');
  await showView(page, ctslAircraft, 'console', 'en');
  await expect(valve(page)).toHaveAttribute('aria-label', /: open$/i);
  await valve(page).click();
  await expect(valve(page)).toHaveAttribute('aria-label', /: closed$/i);
  await expect(done(page, 'Parking-brake valve On')).toBeVisible();
}

async function expectParkingBrakeHolds(page: Page) {
  const check = row(page, 'Parking brake: holds, brake lever released');
  await check.getByRole('button', { name: copy.checklist.checkOff, exact: true }).click();
  await expect(done(page, 'Parking brake: holds, brake lever released')).toBeVisible();
  await expect(checklistPane(page).getByText(copy.checklist.noDeviations)).toBeVisible();
}

test('the CTSL brake lever brakes only while held and the closed valve keeps the parking brake', async ({
  page,
}) => {
  await closeValve(page);
  await expect(lever(page)).toHaveAttribute('aria-pressed', 'false');
  const atRest = await leverArt(page).getAttribute('transform');

  const box = await lever(page).boundingBox();
  if (!box) throw new Error('the brake lever is not on screen');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(lever(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(leverArt(page)).not.toHaveAttribute('transform', atRest ?? '');
  await expect(done(page, 'Brake lever pulled and held')).toBeVisible();

  await page.mouse.up();
  await expect(lever(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(leverArt(page)).toHaveAttribute('transform', atRest ?? '');

  await expectParkingBrakeHolds(page);
});

test('the CTSL brake lever springs back when a held key is released', async ({ page }) => {
  await closeValve(page);
  const atRest = await leverArt(page).getAttribute('transform');

  await lever(page).focus();
  await page.keyboard.down('Space');
  await expect(lever(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(leverArt(page)).not.toHaveAttribute('transform', atRest ?? '');
  await expect(done(page, 'Brake lever pulled and held')).toBeVisible();

  await page.keyboard.up('Space');
  await expect(lever(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(leverArt(page)).toHaveAttribute('transform', atRest ?? '');

  await expectParkingBrakeHolds(page);
});

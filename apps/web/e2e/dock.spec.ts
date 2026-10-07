import { ctslAircraft } from '@cpt/aircraft-ctsl';
import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import { openAircraft } from './legibility';

// No aircraft declares a dock yet, so the page is asked for one before it loads; the hook it
// gets back opens and closes the dock the way a slot mirror will.
type DockHook = { open?: (installId: string) => void; close?: () => void };
const withHook = (page: Page) =>
  page.addInitScript(() => {
    (window as unknown as { __cptDock: DockHook }).__cptDock = {};
  });
const open = (page: Page, installId: string) =>
  page.evaluate(
    (id) => (window as unknown as { __cptDock: DockHook }).__cptDock.open?.(id),
    installId,
  );

const dock = (page: Page) => page.getByRole('region', { name: 'Device dock' });
const tabs = (page: Page) => page.getByRole('tabpanel');

const hint = 'Select a device on the panel to operate it here.';

test.beforeEach(async ({ page }) => {
  await withHook(page);
  await openAircraft(page, ctslAircraft);
  await expect(dock(page)).toBeVisible();
});

test('the dock starts empty, with a hint, under the tab panel', async ({ page }) => {
  await expect(dock(page)).toHaveText(hint);
  const panel = await tabs(page).boundingBox();
  const box = await dock(page).boundingBox();
  if (!panel || !box) throw new Error('no boxes');
  expect(box.y).toBeGreaterThanOrEqual(panel.y + panel.height);
  await expect(tabs(page).getByText(hint)).toHaveCount(0);
});

test('the dock shows the operable device, swaps it and empties with the close button', async ({
  page,
}) => {
  await open(page, 'xpdr');
  await expect(dock(page).getByRole('group', { name: 'gtx327', exact: true })).toBeVisible();
  await expect(dock(page).getByText(hint)).toHaveCount(0);

  await open(page, 'gps');
  await expect(dock(page).getByRole('group', { name: 'gpsmap496', exact: true })).toBeVisible();
  await expect(dock(page).getByRole('group')).toHaveCount(1);

  const close = dock(page).getByRole('button', { name: 'Close device' });
  const size = await close.boundingBox();
  expect(size?.width).toBeGreaterThanOrEqual(44);
  expect(size?.height).toBeGreaterThanOrEqual(44);
  await close.click();
  await expect(dock(page)).toHaveText(hint);
  await expect(dock(page).getByRole('group')).toHaveCount(0);
});

test('the docked device operates and the dock is not modal', async ({ page }) => {
  await open(page, 'xpdr');
  const unit = dock(page).getByRole('group', { name: 'gtx327', exact: true });
  await unit.getByRole('button').first().click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  const other = page.getByRole('tab').nth(1);
  await other.click();
  await expect(other).toHaveAttribute('aria-selected', 'true');
  await expect(unit).toBeVisible();
});

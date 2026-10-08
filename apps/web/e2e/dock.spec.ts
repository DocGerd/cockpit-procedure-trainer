import { ctslAircraft } from '@cpt/aircraft-ctsl';
import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import { deviceTargets, fitViewAt, openAircraft, showView } from './legibility';

const dock = (page: Page) => page.getByRole('region', { name: 'Device dock' });
const tabs = (page: Page) => page.getByRole('tabpanel');

const hint = 'Select a device on the panel to operate it here.';

const slotButton = (page: Page, installId: string) =>
  page.locator(`[data-placement="${installId}"]`).getByRole('button');
const open = (page: Page, installId: string) => slotButton(page, installId).click();

test.beforeEach(async ({ page }) => {
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
  await expect(close).toHaveText('Close');
  const size = await close.boundingBox();
  expect(size?.width).toBeGreaterThanOrEqual(44);
  expect(size?.height).toBeGreaterThanOrEqual(44);
  await close.click();
  await expect(dock(page)).toHaveText(hint);
  await expect(dock(page).getByRole('group')).toHaveCount(0);
});

test('the empty dock is panel hardware in both themes, with a slim hint strip', async ({
  page,
}) => {
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const colours = await dock(page).evaluate((region) => {
      const probe = document.createElement('span');
      document.body.append(probe);
      const resolve = (token: string) => {
        probe.style.color = `var(${token})`;
        return getComputedStyle(probe).color;
      };
      const result = {
        background: getComputedStyle(region).backgroundColor,
        surface: resolve('--panel-surface'),
        strip: getComputedStyle(region.querySelector('.dock-hint') as Element).backgroundColor,
        face: resolve('--panel-face'),
      };
      probe.remove();
      return result;
    });
    expect(colours.background, `${theme} dock background`).toBe(colours.surface);
    expect(colours.strip, `${theme} hint strip background`).toBe(colours.face);
    const strip = await dock(page).getByText(hint).boundingBox();
    expect(strip?.height, `${theme} hint strip`).toBeLessThanOrEqual(36);
  }
  await page.emulateMedia({ colorScheme: 'light' });
});

test('a docked device sits on the panel surface with a panel-plastic close button in both themes', async ({
  page,
}) => {
  await open(page, 'xpdr');
  await expect(dock(page).getByRole('group', { name: 'gtx327', exact: true })).toBeVisible();
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const colours = await dock(page).evaluate((region) => {
      const probe = document.createElement('span');
      document.body.append(probe);
      const resolve = (token: string) => {
        probe.style.color = `var(${token})`;
        return getComputedStyle(probe).color;
      };
      const close = region.querySelector('.dock-close') as Element;
      const result = {
        background: getComputedStyle(region).backgroundColor,
        surface: resolve('--panel-surface'),
        close: getComputedStyle(close).backgroundColor,
        plastic: resolve('--panel-plastic'),
      };
      probe.remove();
      return result;
    });
    expect(colours.background, `${theme} held dock background`).toBe(colours.surface);
    expect(colours.close, `${theme} close button background`).toBe(colours.plastic);
  }
  await page.emulateMedia({ colorScheme: 'light' });
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

test('each device slot mirrors its device with one button of the touch-target size', async ({
  page,
}) => {
  const installs = Object.values(ctslAircraft.devices ?? {});
  const viewIds = [...new Set(installs.map((install) => install.view))];
  expect(viewIds.length).toBeGreaterThan(0);
  for (const viewId of viewIds) {
    const root = await showView(page, ctslAircraft, viewId, 'en');
    await fitViewAt(page, viewId, ctslAircraft.cockpit?.views[viewId]?.minWidth ?? 0);
    const slots = root.locator('[data-kind="device"]');
    const expected = installs.filter((install) => install.view === viewId).length;
    await expect(slots).toHaveCount(expected);
    for (const slot of await slots.all()) {
      await expect(slot.locator('[data-device-mirror]')).toHaveCount(1);
      await expect(slot.getByRole('button')).toHaveCount(1);
    }
    expect(await deviceTargets(root)).toEqual([]);
  }
});

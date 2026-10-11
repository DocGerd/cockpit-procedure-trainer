import { ctslAircraft } from '@cpt/aircraft-ctsl';
import { expect, test } from './fixtures';
import type { Locator, Page } from '@playwright/test';
import { checklistPane, copy, deviceDock as dock, openPicker } from './trainer';

const radioAndTransponder = 'radioAndTransponder';
const found = ctslAircraft.procedures[radioAndTransponder]?.title.en;
if (!found) throw new Error('The CTSL has no radioAndTransponder');
const title: string = found;

const hint = 'Select a device on the panel to operate it here.';

// Pressing MODE on the first item presses the target of a later item early.
const modeItem =
  (ctslAircraft.procedures[radioAndTransponder]?.items ?? []).findIndex(
    (item) => item.type === 'action' && item.control === 'xpdr.mode' && item.position === 'pressed',
  ) + 1;

const unit = (page: Page, device: string) =>
  dock(page).getByRole('group', { name: device, exact: true });
const slotRing = (page: Page) => page.locator('[data-outline="target"]');
const slot = (page: Page, installId: string) => page.locator(`[data-placement="${installId}"]`);
const row = (page: Page, index: number) => checklistPane(page).getByRole('listitem').nth(index);
const done = (page: Page, index: number) =>
  row(page, index).getByRole('img', { name: /^(Done|Deviated)$/ });

async function pick(page: Page, mode: 'guided' | 'practice') {
  await openPicker(page);
  await page.getByRole('button', { name: ctslAircraft.name.en }).click();
  await page.getByRole('button', { name: title }).click();
  await page.getByRole('radio', { name: copy.shell[mode] }).check();
  await page.getByRole('button', { name: copy.shell.startProcedure, exact: true }).click();
}

async function start(page: Page, mode: 'guided' | 'practice') {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await pick(page, mode);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
}

async function expectSameBox(a: Locator, b: Locator) {
  const [first, second] = await Promise.all([a.boundingBox(), b.boundingBox()]);
  if (!first || !second) throw new Error('no boxes');
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    expect(Math.abs(first[key] - second[key]), key).toBeLessThanOrEqual(1);
  }
}

/** Press a key of the docked unit by its accessible name; in Guided it is the one ringed first. */
async function press(page: Page, device: string, name: string, guided: boolean) {
  const key = unit(page, device).getByRole('button', { name, exact: true });
  if (guided) {
    const ringed = unit(page, device).locator('[data-target="true"]');
    await expect(ringed).toHaveAccessibleName(name);
    await expect(ringed).toHaveCSS('outline-style', 'solid');
  }
  await key.click();
}

async function radioSteps(page: Page, guided = false) {
  await press(page, 'atr833', 'I/O', guided);
  await expect(done(page, 0)).toBeVisible();
  await press(page, 'atr833', 'FREQ +', guided);
  await expect(done(page, 1)).toBeVisible();
  await press(page, 'atr833', 'SWAP', guided);
  await expect(done(page, 2)).toBeVisible();
  await row(page, 3).getByRole('button', { name: copy.checklist.checkOff, exact: true }).click();
}

async function transponderSteps(page: Page, guided = false) {
  await press(page, 'trt800h', 'I/O', guided);
  await expect(done(page, 4)).toBeVisible();
  await press(page, 'trt800h', 'VFR', guided);
  await expect(done(page, 5)).toBeVisible();
  await row(page, 6).getByRole('button', { name: copy.checklist.checkOff, exact: true }).click();
  await press(page, 'trt800h', 'MODE', guided);
  await expect(done(page, 7)).toBeVisible();
  await row(page, 8).getByRole('button', { name: copy.checklist.checkOff, exact: true }).click();
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: copy.checklist.summaryTitle.replace('{title}', title),
    }),
  ).toBeVisible();
}

test('Guided docks each device the steps target, rings its slot and the docked device', async ({
  page,
}) => {
  await start(page, 'guided');
  await expect(unit(page, 'atr833')).toBeVisible();
  await expect(slotRing(page)).toHaveCount(1);
  await expectSameBox(slotRing(page), slot(page, 'com'));
  await expect(dock(page).locator('[data-dock-device="com"]')).toHaveAttribute(
    'data-target',
    'true',
  );
  await expect(page.getByRole('tab')).toHaveCount(0);

  await radioSteps(page, true);

  await expect(unit(page, 'trt800h')).toBeVisible();
  await expect(unit(page, 'atr833')).toHaveCount(0);
  await expectSameBox(slotRing(page), slot(page, 'xpdr'));
  await expect(dock(page).locator('[data-dock-device="xpdr"]')).toHaveAttribute(
    'data-target',
    'true',
  );
  await transponderSteps(page, true);
});

test('Guided leaves the dock to the pilot after closing it on a step', async ({ page }) => {
  await start(page, 'guided');
  await expect(unit(page, 'atr833')).toBeVisible();
  await dock(page).getByRole('button', { name: 'Close device' }).click();
  await expect(dock(page)).toHaveText(hint);
  await slot(page, 'com').getByRole('button').click();
  await expect(unit(page, 'atr833')).toBeVisible();
});

test('Guided keeps the shown tab for a device target', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await pick(page, 'guided');
  const centre = page.getByRole('tab', { name: ctslAircraft.views.centre?.name.en ?? 'Centre' });
  await expect(unit(page, 'atr833')).toBeVisible();
  await centre.click();
  await unit(page, 'atr833').getByRole('button', { name: 'FREQ +' }).click();
  await unit(page, 'atr833').getByRole('button', { name: 'SWAP' }).click();
  await expect(centre).toHaveAttribute('aria-selected', 'true');
  await expect(unit(page, 'atr833')).toBeVisible();
});

test('Practice opens and rings nothing, and lists a deviation made on a device at the end', async ({
  page,
}) => {
  await start(page, 'practice');
  await expect(dock(page)).toHaveText(hint);
  await expect(page.locator('[data-outline]')).toHaveCount(0);

  await slot(page, 'xpdr').getByRole('button').click();
  await unit(page, 'trt800h').getByRole('button', { name: 'MODE', exact: true }).click();
  await expect(page.locator('[data-target]')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByText(/\d+ deviations?/)).toHaveCount(0);

  await slot(page, 'com').getByRole('button').click();
  await radioSteps(page);
  await expect(dock(page).locator('[data-dock-device="com"]')).toBeVisible();
  await slot(page, 'xpdr').getByRole('button').click();
  await transponderSteps(page);
  await expect(
    checklistPane(page)
      .getByRole('region', { name: copy.checklist.deviationsHeading })
      .getByRole('listitem'),
  ).toContainText(
    copy.checklist.outOfOrderTitle
      .replace('{control}', 'Mode')
      .replace('{later}', String(modeItem)),
  );
});

test('Guided shows the deviation made on a device at once', async ({ page }) => {
  await start(page, 'guided');
  await slot(page, 'xpdr').getByRole('button').click();
  await unit(page, 'trt800h').getByRole('button', { name: 'MODE', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(
    copy.checklist.bannerPressedEarly
      .replace('{control}', 'Mode')
      .replace('{later}', String(modeItem))
      .replace('{n}', '1'),
  );
});

test('Free explore docks the device of an activated slot and rings nothing', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openPicker(page);
  await page.getByRole('button', { name: ctslAircraft.name.en }).click();
  await page.getByRole('button', { name: copy.shell.exploreCockpit }).click();
  await expect(dock(page)).toHaveText(hint);

  await slot(page, 'gps').getByRole('button').click();
  await expect(unit(page, 'aera500')).toBeVisible();
  await slot(page, 'com').getByRole('button').click();
  await expect(unit(page, 'atr833')).toBeVisible();
  await expect(unit(page, 'aera500')).toHaveCount(0);
  await expect(page.locator('[data-outline="target"], [data-target]')).toHaveCount(0);
});

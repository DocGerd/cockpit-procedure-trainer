import { ctslAircraft } from '@cpt/aircraft-ctsl';
import { ACQUIRE_MS, SELF_TEST_MS, SELF_TEST_STEP_MS } from '@cpt/device-flarm/logic';
import { expect, test } from './fixtures';
import type { Locator, Page } from '@playwright/test';
import { copy, dockedUnit, openPicker } from './trainer';

const descent = ctslAircraft.procedures.descent;
if (!descent) throw new Error('The CTSL has no descent procedure');
if (descent.startPhase !== 'cruise') throw new Error('The CTSL descent no longer starts in cruise');
const descentTitle = descent.title.en;

const MARGIN_MS = SELF_TEST_STEP_MS;

/** Sets a CTSL breaker or rocker through its panel button, whose label ends in its position. */
async function setControl(page: Page, id: string, position: 'in' | 'pulled' | 'on' | 'off') {
  const button = page.locator(`[data-placement="${id}"] button`);
  const atPosition = new RegExp(`: ${position}$`, 'i');
  await expect(button).toHaveAttribute('aria-label', /: (in|pulled|on|off)$/i);
  if (!atPosition.test((await button.getAttribute('aria-label')) ?? '')) await button.click();
  await expect(button).toHaveAttribute('aria-label', atPosition);
}

/** Starts in cruise, where the seeds have every unit running, with the clock paused. */
async function startInCruise(page: Page) {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.clock.install();
  await openPicker(page);
  await page.getByRole('button', { name: ctslAircraft.name.en }).click();
  await page.getByRole('button', { name: descentTitle }).click();
  await page.getByRole('radio', { name: copy.shell.practice }).check();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
  await page.getByRole('button', { name: copy.shell.startProcedure, exact: true }).click();
}

const field = (scope: Locator, name: string) => scope.locator(`[data-field="${name}"]`);
const led = (scope: Locator, id: string) => scope.locator(`[data-led="${id}"]`);

test('pulling and resetting the transponder breaker leaves the TRT800H dark until I/O, codes kept', async ({
  page,
}) => {
  await startInCruise(page);
  const unit = await dockedUnit(page, 'xpdr', 'trt800h');
  const display = unit.locator('[data-display]');
  const mirror = page.locator('[data-placement="xpdr"] [data-device-mirror]');
  await expect(field(display, 'mode')).toHaveText('ACS');
  await expect(field(display, 'code')).toHaveText('7000');

  await setControl(page, 'xpdrBreaker', 'pulled');
  await expect(field(display, 'code')).toHaveText('');
  await expect(field(display, 'mode')).toHaveText('');
  await expect(field(mirror, 'code')).toHaveText('');
  await unit.getByRole('button', { name: 'MODE', exact: true }).click();
  await expect(field(display, 'mode')).toHaveText('');

  await setControl(page, 'xpdrBreaker', 'in');
  await expect(field(display, 'code')).toHaveText('');
  await unit.getByRole('button', { name: 'MODE', exact: true }).click();
  await expect(field(display, 'mode')).toHaveText('');

  await unit.getByRole('button', { name: 'I/O', exact: true }).click();
  await expect(field(display, 'status')).toHaveText('STBY');
  await expect(field(display, 'code')).toHaveText('7000');
  await unit.getByRole('button', { name: 'MODE', exact: true }).click();
  await expect(field(display, 'mode')).toHaveText('ACS');
  await expect(field(mirror, 'code')).toHaveText('7000');
});

test('pulling and resetting the GPS breaker restarts the aera 500 at its database page', async ({
  page,
}) => {
  await startInCruise(page);
  const unit = await dockedUnit(page, 'gps', 'aera500');
  const display = unit.locator('[data-display]');
  await expect(display.locator('[data-page="map"]')).toBeVisible();

  await setControl(page, 'gpsBreaker', 'pulled');
  await expect(display.locator('[data-page]')).toHaveCount(0);

  await setControl(page, 'gpsBreaker', 'in');
  await expect(display.locator('[data-page="startup"]')).toBeVisible();
  await unit.getByRole('button', { name: 'Press To Accept', exact: true }).click();
  await expect(display.locator('[data-page="home"]')).toBeVisible();
  await unit.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(display.locator('[data-page="map"]')).toBeVisible();
});

test('a second pull of the GPS breaker during the aera 500 start-up page still ends on the start-up page', async ({
  page,
}) => {
  await startInCruise(page);
  const unit = await dockedUnit(page, 'gps', 'aera500');
  const display = unit.locator('[data-display]');
  await setControl(page, 'gpsBreaker', 'pulled');
  await setControl(page, 'gpsBreaker', 'in');
  await expect(display.locator('[data-page="startup"]')).toBeVisible();
  await setControl(page, 'gpsBreaker', 'pulled');
  await expect(display.locator('[data-page]')).toHaveCount(0);
  await setControl(page, 'gpsBreaker', 'in');
  await expect(display.locator('[data-page="startup"]')).toBeVisible();
});

test('the FLARM has no breaker: the avionics master takes it down and it starts over', async ({
  page,
}) => {
  await startInCruise(page);
  const unit = await dockedUnit(page, 'flarm', 'flarm');
  await expect(led(unit, 'tx')).toHaveAttribute('data-lit', 'true');

  await setControl(page, 'avionicsMaster', 'off');
  for (const id of ['power', 'gps', 'tx', 'ring-0']) {
    await expect(led(unit, id)).toHaveAttribute('data-lit', 'false');
  }

  await setControl(page, 'avionicsMaster', 'on');
  await expect(led(unit, 'ring-0')).toHaveAttribute('data-lit', 'true');
  await expect(led(unit, 'power')).toHaveAttribute('data-lit', 'false');

  await page.clock.runFor(SELF_TEST_MS + MARGIN_MS);
  await expect(led(unit, 'power')).toHaveAttribute('data-lit', 'true');
  await expect(led(unit, 'tx')).toHaveAttribute('data-lit', 'false');
  await page.clock.runFor(ACQUIRE_MS + 1000);
  await expect(led(unit, 'tx')).toHaveAttribute('data-lit', 'true');
});

test('the FLARM restarts its self-test when the master comes back during it', async ({ page }) => {
  await startInCruise(page);
  const unit = await dockedUnit(page, 'flarm', 'flarm');
  await setControl(page, 'avionicsMaster', 'off');
  await setControl(page, 'avionicsMaster', 'on');
  await page.clock.runFor(SELF_TEST_STEP_MS * 3);
  await expect(led(unit, 'power')).toHaveAttribute('data-lit', 'false');
  await setControl(page, 'avionicsMaster', 'off');
  await expect(led(unit, 'ring-0')).toHaveAttribute('data-lit', 'false');
  await setControl(page, 'avionicsMaster', 'on');
  await expect(led(unit, 'ring-0')).toHaveAttribute('data-lit', 'true');

  // Power is the chase's last LED: a self-test that carried on would have lit it by now.
  await page.clock.runFor(SELF_TEST_MS - SELF_TEST_STEP_MS * 2);
  await expect(led(unit, 'power')).toHaveAttribute('data-lit', 'false');
  await page.clock.runFor(SELF_TEST_STEP_MS * 3);
  await expect(led(unit, 'power')).toHaveAttribute('data-lit', 'true');
});

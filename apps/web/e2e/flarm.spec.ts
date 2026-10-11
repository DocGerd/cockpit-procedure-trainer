import { ctslAircraft } from '@cpt/aircraft-ctsl';
import { expect, test } from './fixtures';
import type { Locator, Page } from '@playwright/test';
import { copy, dockedUnit, openPicker } from './trainer';

const beforeTakeoff = ctslAircraft.procedures.beforeTakeoff;
if (beforeTakeoff?.startPhase !== 'holding') throw new Error('The CTSL has no beforeTakeoff');

// Each wait outlasts its stage in packages/device-flarm (self-test, GPS search, confirmation run).
const SELF_TEST_MS = 2000;
const ACQUIRE_MS = 31_000;
const CONFIRM_MS = 1000;
const HOLD_MS = 2000;

/** Starts at the holding point, where avionics power reaches the FLARM, with the clock paused. */
async function openInDock(page: Page) {
  await page.clock.install();
  await openPicker(page);
  await page.getByRole('button', { name: ctslAircraft.name.en }).click();
  await page.getByRole('button', { name: beforeTakeoff?.title.en ?? '' }).click();
  await page.getByRole('radio', { name: copy.shell.practice }).check();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
  await page.getByRole('button', { name: copy.shell.startProcedure, exact: true }).click();
  return dockedUnit(page, 'flarm', 'flarm');
}

const led = (scope: Locator, id: string) => scope.locator(`[data-led="${id}"]`);

test('the FLARM runs its self-test on power, then finds its fix and lights Power, GPS and TX', async ({
  page,
}) => {
  const unit = await openInDock(page);
  const slot = page.locator('[data-placement="flarm"]').getByRole('button');
  await expect(led(unit, 'ring-0')).toHaveAttribute('data-lit', 'true');
  await expect(led(unit, 'power')).toHaveAttribute('data-lit', 'false');
  await expect(slot).toHaveAttribute('aria-label', 'FLARM: Self-test');

  await page.clock.runFor(SELF_TEST_MS);
  await expect(led(unit, 'power')).toHaveAttribute('data-lit', 'true');
  await expect(led(unit, 'tx')).toHaveAttribute('data-lit', 'false');
  await expect(led(unit, 'ring-0')).toHaveAttribute('data-lit', 'false');
  await expect(slot).toHaveAttribute('aria-label', /GPS searching/);

  await page.clock.runFor(ACQUIRE_MS);
  await expect(led(unit, 'power')).toHaveAttribute('data-lit', 'true');
  await expect(led(unit, 'tx')).toHaveAttribute('data-lit', 'true');
  await expect(slot).toHaveAttribute('aria-label', 'FLARM: Power lit, GPS lit, TX lit, RX dark');
});

test('a Mode push of about two seconds runs the confirmation on the ring', async ({ page }) => {
  const unit = await openInDock(page);
  await page.clock.runFor(SELF_TEST_MS);
  const ringLit = unit.locator('[data-led^="ring-"][data-lit="true"]');
  await expect(ringLit).toHaveCount(0);

  await unit.getByRole('button', { name: 'Mode', exact: true }).hover();
  await page.mouse.down();
  await page.clock.runFor(HOLD_MS);
  await page.mouse.up();
  await expect(ringLit).toHaveCount(2);

  await page.clock.runFor(CONFIRM_MS);
  await expect(ringLit).toHaveCount(0);
});

test('the Mode key darkens while it is held down', async ({ page }) => {
  const unit = await openInDock(page);
  const key = unit.getByRole('button', { name: 'Mode', exact: true });
  const background = () => key.evaluate((element) => getComputedStyle(element).backgroundColor);
  const clear = 'rgba(0, 0, 0, 0)';
  expect(await background()).toBe(clear);

  await key.hover();
  await page.mouse.down();
  expect(await background()).not.toBe(clear);
  await page.mouse.up();
  expect(await background()).toBe(clear);
});

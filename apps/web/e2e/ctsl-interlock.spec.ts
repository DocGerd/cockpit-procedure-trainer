import { ctslAircraft } from '@cpt/aircraft-ctsl';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { openAircraft, showView } from './legibility';
import { messages } from '../src/modes/messages';
import { checklistPane, copy } from './trainer';

const notice = messages.en.lockedNotice
  .replaceAll('{control}', 'Ignition')
  .replaceAll('{by}', 'Fuel valve');

const key = (page: Page) => page.locator('[data-placement="ignition"] [role="slider"]');
const valve = (page: Page) => page.locator('[data-placement="fuelValve"] button');
const sourceNotice = messages.en.sourceNotice
  .replaceAll('{control}', 'Ignition')
  .replaceAll('{to}', 'out')
  .replaceAll('{from}', 'off');

const status = (page: Page) => page.getByRole('status').filter({ hasText: /locked by/ });
const lockRing = (page: Page) => page.locator('[data-outline="lock"]');
const sourceStatus = (page: Page) => page.getByRole('status').filter({ hasText: /only from/ });

async function tap(page: Page, placement: string, x: number, y: number) {
  const box = await page.locator(`[data-placement="${placement}"]`).boundingBox();
  if (!box) throw new Error(`${placement} is not on screen`);
  await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
}

async function ownerAt(page: Page, placement: string, x: number, y: number) {
  return page.evaluate(
    ([id, fx, fy]) => {
      const rect = document.querySelector(`[data-placement="${id}"]`)?.getBoundingClientRect();
      if (!rect) return null;
      const hit = document.elementFromPoint(
        rect.left + rect.width * Number(fx),
        rect.top + rect.height * Number(fy),
      );
      return hit?.closest('[data-placement]')?.getAttribute('data-placement') ?? null;
    },
    [placement, x, y] as const,
  );
}

const tapRight = (page: Page) => tap(page, 'ignition', 0.85, 0.5);
const tapLeft = (page: Page) => tap(page, 'ignition', 0.15, 0.5);
const tapValve = (page: Page) => tap(page, 'fuelValve', 0.5, 0.2);

test('the CTSL fuel valve lets the key in only open and out only closed, and holds it at OFF', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openAircraft(page, ctslAircraft, 'engineStart');
  await showView(page, ctslAircraft, 'centre', 'en');
  await expect(key(page)).toHaveAttribute('aria-valuetext', 'out');

  await tapRight(page);
  await expect(status(page)).toHaveText(notice);
  await expect(key(page)).toHaveAttribute('aria-valuetext', 'out');
  await expect(checklistPane(page).getByText(copy.checklist.noDeviations)).toBeVisible();
  await expect(lockRing(page)).toHaveCount(1);
  const ring = await lockRing(page).boundingBox();
  const holder = await page.locator('[data-placement="fuelValve"]').boundingBox();
  if (!ring || !holder) throw new Error('no lock ring over the fuel valve');
  for (const side of ['x', 'y', 'width', 'height'] as const)
    expect(ring[side]).toBeCloseTo(holder[side], 0);

  const topThird = [0.2, 0.35, 0.5, 0.65, 0.8];
  expect(await ownerAt(page, 'ignition', 0.5, 0.15)).toBe('fuelValve');

  await tapValve(page);
  await expect(valve(page)).toHaveAttribute('aria-label', /: open$/i);
  await expect(lockRing(page)).toHaveCount(0);
  for (const x of topThird) expect(await ownerAt(page, 'ignition', x, 0.15)).toBe('ignition');

  for (const stop of ['off', 'left', 'right', 'both']) {
    await tapRight(page);
    await expect(key(page)).toHaveAttribute('aria-valuetext', stop);
  }

  const spring = page.locator('[data-placement="ignition"] .cpt-artwork-spring');
  const box = await spring.boundingBox();
  if (!box) throw new Error('no START button at BOTH');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(key(page)).toHaveAttribute('aria-valuetext', 'start');
  await page.mouse.up();
  await expect(key(page)).toHaveAttribute('aria-valuetext', 'both');

  await key(page).press('Home');
  await expect(key(page)).toHaveAttribute('aria-valuetext', 'both');
  await expect(status(page)).toHaveText(notice);
  for (const stop of ['right', 'left', 'off']) {
    await tapLeft(page);
    await expect(key(page)).toHaveAttribute('aria-valuetext', stop);
  }
  await tapLeft(page);
  await expect(key(page)).toHaveAttribute('aria-valuetext', 'off');
  await expect(status(page)).toHaveText(notice);
  for (const stop of ['left', 'right', 'both']) {
    await tapRight(page);
    await expect(key(page)).toHaveAttribute('aria-valuetext', stop);
  }

  await tapValve(page);
  await expect(valve(page)).toHaveAttribute('aria-label', /: closed$/i);
  await expect(key(page)).toHaveAttribute('aria-valuetext', 'both');

  await key(page).press('Home');
  await expect(key(page)).toHaveAttribute('aria-valuetext', 'both');
  await expect(sourceStatus(page)).toHaveText(sourceNotice);
  await expect(status(page)).toHaveCount(0);
  const keyRing = await lockRing(page).boundingBox();
  const keyBox = await page.locator('[data-placement="ignition"]').boundingBox();
  if (!keyRing || !keyBox) throw new Error('no lock ring over the ignition key');
  for (const side of ['x', 'y', 'width', 'height'] as const)
    expect(keyRing[side]).toBeCloseTo(keyBox[side], 0);

  for (const stop of ['right', 'left', 'off']) {
    await tapLeft(page);
    await expect(key(page)).toHaveAttribute('aria-valuetext', stop);
  }

  await tapRight(page);
  await expect(key(page)).toHaveAttribute('aria-valuetext', 'off');
  await expect(status(page)).toHaveText(notice);

  await tapLeft(page);
  await expect(key(page)).toHaveAttribute('aria-valuetext', 'out');
  await tapRight(page);
  await expect(key(page)).toHaveAttribute('aria-valuetext', 'out');
  await expect(status(page)).toHaveText(notice);
});

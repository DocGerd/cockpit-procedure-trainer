import { ctslAircraft } from '@cpt/aircraft-ctsl';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { TOUCH_TARGET_PX, openAircraft } from './legibility';
import { checklistPane, copy } from './trainer';

const settingWindow = (page: Page) =>
  page.locator('[data-placement="altimeter"] [data-window="setting"]');
const knob = (page: Page) =>
  page.getByRole('slider', { name: 'Altimeter setting knob', exact: true });
const handTurns = (page: Page) =>
  page
    .locator('[data-placement="altimeter"] svg[data-moving="needles"] > image')
    .evaluateAll((hands) => hands.map((hand) => hand.getAttribute('transform')));

async function tap(target: Locator, side: 'left' | 'right') {
  const box = await target.boundingBox();
  if (!box) throw new Error('the knob is not on screen');
  await target.click({
    position: { x: side === 'left' ? box.width * 0.1 : box.width * 0.9, y: box.height / 2 },
  });
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
});

test('ctsl: the altimeter knob sets the window and turns all three hands together', async ({
  page,
}) => {
  await openAircraft(page, ctslAircraft, 'beforeTakeoff');
  await expect(settingWindow(page)).toHaveText('1025');
  const before = await handTurns(page);
  expect(before).toHaveLength(3);

  await tap(knob(page), 'left');
  await expect(settingWindow(page)).toHaveText('1024');
  const after = await handTurns(page);
  expect(after.every((turn, index) => turn !== before[index])).toBe(true);

  await tap(knob(page), 'right');
  await expect(settingWindow(page)).toHaveText('1025');

  await knob(page).focus();
  await knob(page).press('ArrowDown');
  await expect(settingWindow(page)).toHaveText('1024');
  await expect(knob(page)).toHaveAttribute('aria-valuetext', '1024');
});

test('ctsl: holding the knob turns it on detent by detent', async ({ page }) => {
  await openAircraft(page, ctslAircraft, 'beforeTakeoff');
  const box = await knob(page).boundingBox();
  if (!box) throw new Error('the knob is not on screen');
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height / 2);
  await page.mouse.down();
  await expect(settingWindow(page)).toHaveText('1020');
  await page.mouse.up();
  const stopped = await settingWindow(page).textContent();
  expect(Number(stopped)).toBeLessThanOrEqual(1020);
  await page.waitForTimeout(300);
  await expect(settingWindow(page)).toHaveText(stopped ?? '');
});

test('ctsl: the knob is a full touch target beside the altimeter', async ({ page }) => {
  await openAircraft(page, ctslAircraft, 'beforeTakeoff');
  const box = await knob(page).boundingBox();
  expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(TOUCH_TARGET_PX);
});

test('ctsl: Guided rings the knob at the descent altimeter step', async ({ page }) => {
  await openAircraft(page, ctslAircraft, 'descent');
  const first = checklistPane(page).locator('li.checklist-item').nth(0);
  await first.getByRole('button', { name: copy.checklist.confirm, exact: true }).click();
  const ring = await page.locator('[data-outline="target"]').boundingBox();
  const placement = await page.locator('[data-placement="altimeterSetting"]').boundingBox();
  if (!ring || !placement) throw new Error('no ring or no knob');
  expect(Math.abs(ring.x + ring.width / 2 - (placement.x + placement.width / 2))).toBeLessThan(2);
  expect(Math.abs(ring.y + ring.height / 2 - (placement.y + placement.height / 2))).toBeLessThan(2);
});

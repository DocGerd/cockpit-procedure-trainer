import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import { startProcedure } from './trainer';
import { messages } from '../src/panel/messages';

const resetZoom = messages.en.resetZoom;

const stage = (page: Page) => page.locator('.panel-stage');
const zoomed = (page: Page) => page.locator('.panel-zoom[data-zoomed]');

const scaleOf = async (page: Page) =>
  Number(
    await page
      .locator('.panel-zoom')
      .evaluate((element) => getComputedStyle(element).getPropertyValue('--panel-scale')),
  );

test('a two-finger pinch zooms the panel and the reset button restores it', async ({ page }) => {
  await startProcedure(page, 'engineStart', 'guided');
  await expect(zoomed(page)).toHaveCount(0);

  const box = await stage(page).boundingBox();
  if (!box) throw new Error('The panel stage has no box');
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const touch = (points: { x: number; y: number }[]) => ({
    touchPoints: points.map((point, id) => ({ ...point, id })),
  });
  const spread = (half: number) => [
    { x: centre.x - half, y: centre.y },
    { x: centre.x + half, y: centre.y },
  ];
  const session = await page.context().newCDPSession(page);

  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', ...touch(spread(20)) });
  for (const half of [40, 60, 80, 100]) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', ...touch(spread(half)) });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();

  await expect(zoomed(page)).toHaveCount(1);
  expect(await scaleOf(page)).toBeGreaterThan(1);

  await page.getByRole('button', { name: resetZoom }).click();
  await expect(zoomed(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: resetZoom })).toHaveCount(0);
});

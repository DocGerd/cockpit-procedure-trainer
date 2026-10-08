import { ctslAircraft } from '@cpt/aircraft-ctsl';
import { expect, test } from './fixtures';
import { openAircraft } from './legibility';
import { checklistPane, copy } from './trainer';

test('ctsl: Guided rings nothing for the engine fire smoke check, then the fuel valve', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openAircraft(page, ctslAircraft, 'engineFire');
  const pane = checklistPane(page);
  const ring = page.locator('[data-outline="target"]');

  await expect(pane.getByText(copy.checklist.hintLook)).toBeVisible();
  await expect(ring).toHaveCount(0);
  await expect(page.locator('[data-target]')).toHaveCount(0);

  await pane.getByRole('button', { name: copy.checklist.checkOff }).click();
  await expect(ring).toHaveCount(1);
  const valve = await page.locator('[data-placement="fuelValve"]').boundingBox();
  const ringed = await ring.boundingBox();
  if (!valve || !ringed) throw new Error('the fuel valve or its ring is not on screen');
  const centre = { x: valve.x + valve.width / 2, y: valve.y + valve.height / 2 };
  expect(centre.x).toBeGreaterThanOrEqual(ringed.x);
  expect(centre.x).toBeLessThanOrEqual(ringed.x + ringed.width);
  expect(centre.y).toBeGreaterThanOrEqual(ringed.y);
  expect(centre.y).toBeLessThanOrEqual(ringed.y + ringed.height);
});

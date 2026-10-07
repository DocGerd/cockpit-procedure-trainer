import { demoAircraft } from '@cpt/aircraft-demo';
import { expect, test } from './fixtures';
import { openAircraft } from './legibility';
import { checklistPane, copy, deviceDock, dockedUnit, setControl } from './trainer';

const procedureId = 'radioAndTransponder';
const ring = '[data-outline="target"]';

test('Guided docks the demo radio and then the transponder, ringing each slot', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openAircraft(page, demoAircraft, procedureId);
  const row = (index: number) => checklistPane(page).getByRole('listitem').nth(index);
  await expect(deviceDock(page).getByRole('group')).toHaveCount(0);

  await setControl(page, 'avionics', 'on');
  await row(0).getByRole('button', { name: copy.checklist.checkOff, exact: true }).click();

  const radio = await dockedUnit(page, 'radio', 'com');
  await expect(deviceDock(page).locator('[data-dock-device="radio"]')).toHaveAttribute(
    'data-target',
    'true',
  );
  await expect(page.locator(ring)).toHaveCount(1);
  await expect(page.locator(`[data-placement="radio"]`)).toBeVisible();
  const slot = await page.locator('[data-placement="radio"]').boundingBox();
  const mark = await page.locator(ring).boundingBox();
  expect(Math.abs((slot?.x ?? 0) - (mark?.x ?? 99))).toBeLessThanOrEqual(1);
  expect(Math.abs((slot?.y ?? 0) - (mark?.y ?? 99))).toBeLessThanOrEqual(1);

  const ringed = radio.locator('[data-target="true"]');
  await expect(ringed).toHaveText('STBY MHz +');
  await expect(ringed).toHaveCSS('outline-style', 'solid');
  await radio.getByRole('button', { name: 'STBY MHz +' }).click();
  await row(2).getByRole('button', { name: copy.checklist.checkOff, exact: true }).click();
  await radio.getByRole('button', { name: 'SWAP' }).click();
  await row(4).getByRole('button', { name: copy.checklist.checkOff, exact: true }).click();

  await expect(
    deviceDock(page).getByRole('group', { name: 'transponder', exact: true }),
  ).toBeVisible();
  await expect(deviceDock(page).getByRole('group', { name: 'com', exact: true })).toHaveCount(0);
  await expect(deviceDock(page).locator('[data-dock-device="xpdr"]')).toHaveAttribute(
    'data-target',
    'true',
  );
});

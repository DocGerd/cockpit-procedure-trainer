import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { openPicker } from './trainer';

test.use({ seedSoundOff: false });

const header = (page: Page) => page.getByRole('banner');

test('sound off and the volume survive a reload', async ({ page }) => {
  await openPicker(page);
  await header(page).getByRole('button', { name: 'Sound', exact: true }).click();
  await page.getByRole('slider', { name: 'Volume' }).fill('35');
  await page.getByRole('switch').click();
  await expect(page.getByRole('switch', { name: 'Sound off' })).toHaveAttribute(
    'aria-checked',
    'false',
  );

  await page.reload();
  await header(page).getByRole('button', { name: 'Sound', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Sound off' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  const slider = page.getByRole('slider', { name: 'Volume' });
  await expect(slider).toHaveValue('35');
  await expect(slider).toBeDisabled();
});

test('the popover closes on a click outside it', async ({ page }) => {
  await openPicker(page);
  await header(page).getByRole('button', { name: 'Sound', exact: true }).click();
  await expect(page.getByRole('switch')).toBeVisible();
  await page.getByRole('heading', { level: 1 }).click();
  await expect(page.getByRole('switch')).toHaveCount(0);
});

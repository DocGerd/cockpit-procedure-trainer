import { expect, test } from '@playwright/test';
import { aircraft, copy, copyDe, openPicker } from './trainer';

test('the picker loads with the training-aid notice', async ({ page }) => {
  await openPicker(page);

  await expect(page.getByRole('button', { name: aircraft.name.en })).toBeVisible();
  for (const entry of Object.values(aircraft.procedures)) {
    await expect(page.getByRole('button', { name: entry.title.en })).toBeVisible();
  }
  await expect(
    page.getByRole('button', { name: copy.shell.startProcedure, exact: true }),
  ).toBeEnabled();

  const notice = page.getByRole('note', { name: copy.errors.noticeTitle });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText(copy.errors.noticeBody);
});

test('the language switches between English and German', async ({ page }) => {
  await openPicker(page);
  const german = page.getByRole('button', { name: copy.language.german });
  const english = page.getByRole('button', { name: copy.language.english });
  await expect(english).toHaveAttribute('aria-pressed', 'true');

  await german.click();
  await expect(german).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('heading', { level: 1, name: copyDe.shell.pickerTitle }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: aircraft.name.de })).toBeVisible();
  for (const entry of Object.values(aircraft.procedures)) {
    await expect(page.getByRole('button', { name: entry.title.de })).toBeVisible();
  }

  await english.click();
  await expect(english).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { level: 1, name: copy.shell.pickerTitle })).toBeVisible();
  await expect(page.getByRole('button', { name: aircraft.name.en })).toBeVisible();
});

test('the theme switches and is remembered', async ({ page }) => {
  await openPicker(page);

  await page.getByRole('button', { name: copy.shell.switchToDark }).click();
  await expect(page.getByRole('button', { name: copy.shell.switchToLight })).toBeVisible();
  await expect(page.getByRole('button', { name: copy.shell.switchToDark })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('button', { name: copy.shell.switchToLight })).toBeVisible();

  await page.getByRole('button', { name: copy.shell.switchToLight }).click();
  await expect(page.getByRole('button', { name: copy.shell.switchToDark })).toBeVisible();
});

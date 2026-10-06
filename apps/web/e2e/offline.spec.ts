import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { checklistPane, copy, openPicker, procedure, startProcedure } from './trainer';

const engineStart = 'engineStart';

const isControlled = (page: Page) =>
  page.waitForFunction(() => navigator.serviceWorker.controller !== null);

test('the trainer reloads and starts a procedure while offline', async ({ page, context }) => {
  await openPicker(page);
  await isControlled(page);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: copy.shell.pickerTitle })).toBeVisible();
  await isControlled(page);

  await startProcedure(page, engineStart, 'guided');
  const [firstItem] = procedure(engineStart).items;
  if (!firstItem) throw new Error(`The demo procedure "${engineStart}" has no items`);
  await expect(checklistPane(page).getByRole('listitem').first()).toContainText(firstItem.text.en);
});

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import { messages as updateMessages } from '../src/pwa/messages';
import { checklistPane, copy, openPicker, procedure, startProcedure } from './trainer';

const engineStart = 'engineStart';
const updateCopy = updateMessages.en;

const isControlled = (page: Page) =>
  page.waitForFunction(() => navigator.serviceWorker.controller !== null);

test('the trainer reloads and starts a procedure while offline', async ({ page, context }) => {
  await openPicker(page);
  await isControlled(page);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: copy.shell.pickerTitle })).toBeVisible();
  await isControlled(page);
  await expect(page.getByRole('contentinfo')).toContainText(`${copy.shell.version} v`);

  await startProcedure(page, engineStart, 'guided');
  const [firstItem] = procedure(engineStart).items;
  if (!firstItem) throw new Error(`The demo procedure "${engineStart}" has no items`);
  await expect(checklistPane(page).getByRole('listitem').first()).toContainText(firstItem.text.en);
});

// The browser fetches the worker script outside Playwright's routing, so the built file is changed.
const workerFile = new URL('../dist/sw.js', import.meta.url);
let pristineWorker: Buffer | undefined;

test.afterEach(() => {
  if (pristineWorker) writeFileSync(workerFile, pristineWorker);
  pristineWorker = undefined;
});

test('a changed service worker raises the update prompt, which can be dismissed or accepted', async ({
  page,
}) => {
  await openPicker(page);
  await isControlled(page);

  const prompt = page.getByRole('status').filter({ hasText: updateCopy.updateTitle });
  await expect(prompt).toHaveCount(0);

  pristineWorker = readFileSync(workerFile);
  appendFileSync(workerFile, '\n// changed');
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  });

  await expect(prompt).toBeVisible();
  await expect(prompt).toContainText(updateCopy.updateBody);

  await prompt.getByRole('button', { name: updateCopy.later }).click();
  await expect(prompt).toHaveCount(0);

  // The new worker is still waiting, so a fresh page load offers it again.
  await page.reload();
  await expect(prompt).toBeVisible();

  await prompt.getByRole('button', { name: updateCopy.reload }).click();
  await isControlled(page);
  await expect(prompt).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting ?? null),
    )
    .toBeNull();
});

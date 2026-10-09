import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import { messages as modeMessages } from '../src/modes/messages';
import { DESKTOP_MIN_WIDTH } from '../src/shell/layout';
import { aircraft, checklistPane, copy, openPicker, procedure } from './trainer';

const text = modeMessages.en;
const engineStart = 'engineStart';

const viewports = [
  { width: 1920, height: 1080 },
  { width: 768, height: 1024 },
];

const modeButton = (page: Page, name: string) =>
  page
    .getByRole('banner')
    .getByRole('group', { name: text.mode })
    .getByRole('button', { name, exact: true });

const checklistToggle = (page: Page) =>
  page.getByRole('banner').getByRole('button', { name: /^Checklist/ });

async function startFromPicker(page: Page, mode: 'guided' | 'practice') {
  await openPicker(page);
  await page.getByRole('button', { name: procedure(engineStart).title.en }).click();
  await page.getByRole('radio', { name: copy.shell[mode] }).check();
  await page.getByRole('button', { name: copy.shell.startProcedure, exact: true }).click();
}

// A tablet keeps the checklist behind the header toggle; a desktop shows the pane.
async function expectChecklist(page: Page) {
  if ((page.viewportSize()?.width ?? 0) < DESKTOP_MIN_WIDTH) {
    await expect(checklistToggle(page)).toBeVisible();
    if ((await checklistToggle(page).getAttribute('aria-expanded')) !== 'true') {
      await checklistToggle(page).click();
    }
  }
  await expect(checklistPane(page)).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 1, name: procedure(engineStart).title.en }),
  ).toBeVisible();
}

async function enterExplore(page: Page) {
  await modeButton(page, text.explore).click();
  await expect(modeButton(page, text.explore)).toHaveAttribute('aria-pressed', 'true');
}

// Free explore keeps the checklist as a read-only reference: no marks, nothing running.
async function expectReadOnlyChecklist(page: Page) {
  await expectChecklist(page);
  await expect(checklistPane(page).getByRole('img')).toHaveCount(0);
  await expect(page.getByRole('banner').getByTitle(/^Change procedure:/)).toHaveCount(0);
}

for (const viewport of viewports) {
  for (const mode of ['guided', 'practice'] as const) {
    const label = text[mode];

    test(`the checklist returns in ${mode} after Free explore at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await startFromPicker(page, mode);
      await expectChecklist(page);

      await enterExplore(page);
      await expectReadOnlyChecklist(page);

      await modeButton(page, label).click();
      await expect(modeButton(page, label)).toHaveAttribute('aria-pressed', 'true');
      await expectChecklist(page);
    });

    test(`${label} chosen in Free explore without a procedure returns to the picker at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openPicker(page);
      await page.getByRole('button', { name: copy.shell.exploreCockpit }).click();
      await expect(modeButton(page, text.explore)).toHaveAttribute('aria-pressed', 'true');

      await modeButton(page, label).click();
      await expect(
        page.getByRole('heading', { level: 1, name: copy.shell.pickerTitle }),
      ).toBeVisible();
      await expect(page.getByRole('radio', { name: copy.shell[mode] })).toBeChecked();
      await expect(
        page.getByRole('button', { name: copy.shell.startProcedure, exact: true }),
      ).toBeEnabled();
      await expect(page.getByRole('button', { name: aircraft.name.en })).toBeVisible();
    });
  }
}

test('switching Practice to Guided mid-run says live feedback is on', async ({ page }) => {
  await startFromPicker(page, 'practice');
  await expectChecklist(page);

  await modeButton(page, text.guided).click();
  const notice = page.getByRole('status').filter({ hasText: text.guidedOnNotice });
  await expect(notice).toBeVisible();
  await expect(modeButton(page, text.guided)).toHaveAttribute('aria-pressed', 'true');

  const [noticeBox, paneBox, headerBox] = await Promise.all([
    notice.boundingBox(),
    checklistPane(page).boundingBox(),
    page.getByRole('banner').boundingBox(),
  ]);
  if (!noticeBox || !paneBox || !headerBox) throw new Error('missing box');
  expect(noticeBox.y + noticeBox.height, 'notice stays in the header band').toBeLessThanOrEqual(
    paneBox.y,
  );
  expect(noticeBox.y, 'notice top').toBeGreaterThanOrEqual(headerBox.y);
});

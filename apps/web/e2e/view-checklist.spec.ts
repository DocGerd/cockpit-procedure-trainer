import { expect, test } from './fixtures';
import type { Locator, Page } from '@playwright/test';
import { messages as modeMessages } from '../src/modes/messages';
import { DESKTOP_MIN_WIDTH } from '../src/shell/layout';
import {
  checklistPane,
  completeItems,
  copy,
  pickProcedure,
  procedure,
  progress,
  setControl,
} from './trainer';

const engineStart = 'engineStart';
const other = 'beforeTakeoff';
const touchTarget = 44;

const viewports = [
  { width: 1920, height: 1080 },
  { width: 768, height: 1024 },
];

const tablet = (page: Page) => (page.viewportSize()?.width ?? 0) < DESKTOP_MIN_WIDTH;
const toggle = (page: Page) => page.getByRole('banner').getByRole('button', { name: /^Checklist/ });
const selector = (page: Page) =>
  checklistPane(page).getByRole('combobox', { name: copy.checklist.showChecklist });
const title = (page: Page, id: string) =>
  checklistPane(page).getByRole('heading', { level: 1, name: procedure(id).title.en });
const marks = (page: Page) => checklistPane(page).getByRole('img');

async function openChecklist(page: Page) {
  if (tablet(page) && (await toggle(page).getAttribute('aria-expanded')) !== 'true') {
    await toggle(page).click();
  }
  await expect(checklistPane(page)).toBeVisible();
}

// An open tablet drawer covers the panel, so close it before touching a control.
async function closeChecklist(page: Page) {
  if (tablet(page) && (await toggle(page).getAttribute('aria-expanded')) === 'true') {
    await toggle(page).click();
    await expect(checklistPane(page)).toHaveCount(0);
  }
}

async function expectTouchTarget(target: Locator) {
  const box = await target.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(touchTarget);
}

async function enterExplore(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: copy.shell.exploreCockpit }).click();
  await openChecklist(page);
}

for (const viewport of viewports) {
  const size = `${viewport.width}x${viewport.height}`;

  test.describe(size, () => {
    test.use({ viewport });

    test('Free explore shows a read-only checklist, and operating a control ticks nothing', async ({
      page,
    }) => {
      const { items } = procedure(engineStart);
      const action = items.find((item) => item.type === 'action');
      if (action?.type !== 'action') throw new Error('engineStart has no action item');

      await enterExplore(page);
      await expect(selector(page)).toHaveValue(engineStart);
      await expect(title(page, engineStart)).toBeVisible();
      const rows = checklistPane(page).getByRole('listitem');
      await expect(rows).toHaveCount(items.length);
      await expect(rows.first()).toContainText(items[0]?.text.en ?? '');
      await expect(marks(page)).toHaveCount(0);
      await expect(checklistPane(page).getByRole('button')).toHaveCount(0);
      await expect(progress(page)).toHaveCount(0);
      await expectTouchTarget(selector(page));

      await selector(page).selectOption(other);
      await expect(title(page, other)).toBeVisible();
      await expect(rows).toHaveCount(procedure(other).items.length);
      await selector(page).selectOption(engineStart);

      await closeChecklist(page);
      await page.getByRole('checkbox', { name: modeMessages.en.operate }).check();
      await setControl(page, action.control, action.position);
      await openChecklist(page);
      await expect(title(page, engineStart)).toBeVisible();
      await expect(marks(page)).toHaveCount(0);
      await expect(page.getByRole('status')).toHaveCount(0);
    });

    test('Free explore starts on the last procedure that ran', async ({ page }) => {
      await pickProcedure(page, other, 'guided');
      await page.getByRole('button', { name: modeMessages.en.explore }).click();
      await openChecklist(page);
      await expect(selector(page)).toHaveValue(other);
      await expect(title(page, other)).toBeVisible();
    });

    test('viewing another checklist in Guided leaves the running one as it was', async ({
      page,
    }) => {
      await pickProcedure(page, engineStart, 'guided');
      await openChecklist(page);
      await checklistPane(page)
        .getByRole('button', { name: copy.checklist.confirm, exact: true })
        .click();
      await expect(progress(page)).toHaveAttribute('value', '1');

      await selector(page).selectOption(other);
      await expect(title(page, other)).toBeVisible();
      await expect(marks(page)).toHaveCount(0);
      await expect(progress(page)).toHaveCount(0);
      await expect(page.getByRole('banner')).toContainText(procedure(engineStart).title.en);
      const back = checklistPane(page).getByRole('button', {
        name: copy.checklist.backToRunning.replace('{title}', procedure(engineStart).title.en),
      });
      await expectTouchTarget(back);

      await closeChecklist(page);
      await openChecklist(page);
      await expect(title(page, other)).toBeVisible();

      await back.click();
      await expect(title(page, engineStart)).toBeVisible();
      await expect(progress(page)).toHaveAttribute('value', '1');
      await expect(selector(page)).toHaveValue(engineStart);
    });
  });
}

// The drawer of a narrow viewport covers the panel the walk through the items operates.
test.describe('desktop', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('the summary comes forward when the running checklist completes behind another', async ({
    page,
  }) => {
    const { items } = procedure(engineStart);
    const last = items.at(-1);
    if (last?.type !== 'action') throw new Error('engineStart does not end on an action item');

    await pickProcedure(page, engineStart, 'guided');
    await openChecklist(page);
    await completeItems(page, engineStart, items.length - 1);
    await selector(page).selectOption(other);
    await expect(title(page, other)).toBeVisible();

    await closeChecklist(page);
    await setControl(page, last.control, last.position);
    await openChecklist(page);
    await expect(
      checklistPane(page).getByRole('heading', {
        level: 1,
        name: copy.checklist.summaryTitle.replace('{title}', procedure(engineStart).title.en),
      }),
    ).toBeVisible();
    await expect(selector(page)).toHaveValue(engineStart);
  });
});

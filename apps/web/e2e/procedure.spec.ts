import { expect, test } from '@playwright/test';
import {
  aircraft,
  checklistPane,
  completeProcedure,
  copy,
  deviation,
  operateUnrelatedControl,
  procedure,
  progress,
  startProcedure,
} from './trainer';

const engineStart = 'engineStart';
const unrelatedControl = 'flaps';

test('a Guided procedure completes and the summary lists the deviation', async ({ page }) => {
  const { items } = procedure(engineStart);
  expect(
    items.some((item) => item.type === 'action' && item.control === unrelatedControl),
    'the deliberate deviation must use a control the procedure never asks for',
  ).toBe(false);

  await startProcedure(page, engineStart, 'guided');
  const pane = checklistPane(page);
  await expect(pane.getByText(copy.checklist.noDeviations)).toBeVisible();

  await operateUnrelatedControl(page, unrelatedControl);
  await expect(page.getByRole('status')).toContainText(deviation.banner(unrelatedControl, 1));

  await completeProcedure(page, engineStart);

  await expect(pane.getByRole('listitem')).toHaveCount(1);
  await expect(
    pane.getByRole('region', { name: copy.checklist.deviationsHeading }).getByRole('listitem'),
  ).toContainText(deviation.title(unrelatedControl));
});

test.describe('changing the phase during a procedure', () => {
  const startPhase = procedure(engineStart).startPhase;
  const target = Object.entries(aircraft.phases).find(([id]) => id !== startPhase);
  if (!target) throw new Error('The demo aircraft needs a second phase');
  const [targetId, targetPhase] = target;

  test.beforeEach(async ({ page }) => {
    await startProcedure(page, engineStart, 'guided');
    const first = checklistPane(page).getByRole('listitem').first();
    await first.getByRole('button', { name: copy.checklist.confirm, exact: true }).click();
    await expect(progress(page)).toHaveJSProperty('value', 1);
    await page
      .getByLabel(copy.outsideView.phase, { exact: true })
      .selectOption({ label: targetPhase.name.en });
    await expect(page.getByRole('alertdialog', { name: copy.outsideView.jumpTitle })).toBeVisible();
  });

  test('Cancel keeps the procedure and the phase', async ({ page }) => {
    await page.getByRole('button', { name: copy.outsideView.jumpCancel, exact: true }).click();

    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page.getByLabel(copy.outsideView.phase, { exact: true })).toHaveValue(startPhase);
    await expect(progress(page)).toHaveJSProperty('value', 1);
  });

  test('Confirm jumps to the phase and ends the procedure', async ({ page }) => {
    await page.getByRole('button', { name: copy.outsideView.jumpConfirm, exact: true }).click();

    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page.getByLabel(copy.outsideView.phase, { exact: true })).toHaveValue(targetId);
    await expect(checklistPane(page)).toHaveCount(0);
  });
});

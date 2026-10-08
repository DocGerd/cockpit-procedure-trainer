import { expect, test } from './fixtures';
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

test('a Practice run shows no deviation information until the summary', async ({ page }) => {
  await startProcedure(page, engineStart, 'practice');
  const pane = checklistPane(page);

  await operateUnrelatedControl(page, unrelatedControl);

  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByText(deviation.banner(unrelatedControl, 1))).toHaveCount(0);
  await expect(page.getByText(copy.checklist.noDeviations)).toHaveCount(0);
  await expect(page.getByText(/\d+ deviations?/)).toHaveCount(0);
  await expect(pane.getByRole('img', { name: copy.checklist.stateDeviated })).toHaveCount(0);

  await completeProcedure(page, engineStart);

  await expect(
    pane.getByRole('region', { name: copy.checklist.deviationsHeading }).getByRole('listitem'),
  ).toContainText(deviation.title(unrelatedControl));
});

test('Restart asks before it discards a deviation', async ({ page }) => {
  await startProcedure(page, engineStart, 'guided');
  const pane = checklistPane(page);
  await operateUnrelatedControl(page, unrelatedControl);
  await expect(pane.getByText(copy.checklist.noDeviations)).toHaveCount(0);

  await pane.getByRole('button', { name: copy.checklist.restart, exact: true }).click();
  const dialog = page.getByRole('alertdialog', { name: copy.checklist.restartTitle });
  await expect(dialog).toContainText('1 deviation');
  await dialog.getByRole('button', { name: copy.checklist.restartCancel }).click();
  await expect(pane.getByText(copy.checklist.noDeviations)).toHaveCount(0);

  await pane.getByRole('button', { name: copy.checklist.restart, exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: copy.checklist.restart, exact: true })
    .click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(pane.getByText(copy.checklist.noDeviations)).toBeVisible();
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
    await expect(
      page.getByRole('alertdialog', {
        name: copy.outsideView.jumpTitle.replace('{phase}', targetPhase.name.en),
      }),
    ).toBeVisible();
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
    await expect(progress(page)).toHaveCount(0);
    await expect(checklistPane(page).getByRole('img')).toHaveCount(0);
  });
});

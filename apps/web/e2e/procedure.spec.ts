import { SURPRISE_MAX_MS } from '../src/trainer/surprise-delay';
import { control } from './content';
import { expect, test } from './fixtures';
import { selectLanguage } from './legibility';
import {
  aircraft,
  checklistPane,
  completeProcedure,
  copy,
  copyDe,
  deviation,
  openPicker,
  operateUnrelatedControl,
  procedure,
  progress,
  setControl,
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
  await expect(page.getByRole('status')).toContainText(deviation.banner(unrelatedControl));

  await completeProcedure(page, engineStart);

  const rows = pane
    .getByRole('region', { name: copy.checklist.deviationsHeading })
    .getByRole('listitem');
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText(deviation.title(unrelatedControl));
});

test('a Practice run shows no deviation information until the summary', async ({ page }) => {
  await startProcedure(page, engineStart, 'practice');
  const pane = checklistPane(page);

  await operateUnrelatedControl(page, unrelatedControl);

  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByText(deviation.banner(unrelatedControl))).toHaveCount(0);
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

test('a completed run shows in the picker after a reload and sends nothing out', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(`${request.method()} ${request.url()}`));

  await startProcedure(page, engineStart, 'guided');
  await operateUnrelatedControl(page, unrelatedControl);
  await completeProcedure(page, engineStart);
  const pane = checklistPane(page);
  await pane.getByRole('button', { name: copy.checklist.backToSelection }).click();
  await expect(page.getByRole('heading', { level: 1, name: copy.shell.pickerTitle })).toBeVisible();

  await page.reload();
  const title = procedure(engineStart).title.en;
  await expect(
    page
      .getByRole('region', { name: copy.shell.procedure })
      .getByRole('button', { name: new RegExp(title) }),
  ).toContainText('Last run: 1 deviation, today');
  const practiseNext = page.getByRole('button', { name: copy.shell.practiseNext, exact: true });
  await expect(practiseNext).toBeVisible();
  await expect(practiseNext).toHaveAccessibleDescription(
    copy.shell.practiseNextDeviations.replace('{title}', title),
  );

  const origin = new URL(page.url()).origin;
  expect(
    requests.filter((entry) => !entry.split(' ')[1]?.startsWith(origin)),
    'requests to other origins',
  ).toEqual([]);
  expect(
    requests.filter((entry) => !entry.startsWith('GET ')),
    'non-GET requests',
  ).toEqual([]);
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

test('a stray Guided action is ringed until it is back, and Retry this item puts it back', async ({
  page,
}) => {
  await startProcedure(page, engineStart, 'guided');
  const stray = page.locator('[data-outline="stray"]');
  await expect(stray).toHaveCount(0);

  await operateUnrelatedControl(page, unrelatedControl);
  await expect(page.getByRole('status')).toContainText(deviation.banner(unrelatedControl));
  await expect(stray).toBeVisible();

  await checklistPane(page).getByRole('button', { name: copy.checklist.retryItem }).click();
  await expect(stray).toHaveCount(0);
  const flaps = control(unrelatedControl);
  await expect(
    page
      .getByRole('radiogroup', { name: flaps.name.en, exact: true })
      .getByRole('radio', { name: String(flaps.initial), exact: true }),
  ).toBeChecked();
});

for (const language of ['en', 'de'] as const) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`the ${language} ${colorScheme} summary keeps every stat on one line inside its tile`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.emulateMedia({ colorScheme });
      await startProcedure(page, engineStart, 'guided');
      await operateUnrelatedControl(page, unrelatedControl);
      await completeProcedure(page, engineStart);
      await selectLanguage(page, language);

      const tiles = checklistPane(page).locator('.checklist-stat');
      await expect(tiles).toHaveCount(3);
      const fits = await tiles.evaluateAll((elements) =>
        elements.map((tile) => {
          const label = tile.querySelector('dt');
          const value = tile.querySelector('dd');
          if (!label || !value) return false;
          const box = tile.getBoundingClientRect();
          const inside = (rect: DOMRect) => rect.left >= box.left && rect.right <= box.right;
          const line = parseFloat(getComputedStyle(value).lineHeight);
          return (
            inside(label.getBoundingClientRect()) &&
            inside(value.getBoundingClientRect()) &&
            label.scrollWidth <= label.clientWidth &&
            value.getBoundingClientRect().height <= line * 1.5
          );
        }),
      );
      expect(fits).toEqual([true, true, true]);
    });
  }
}

test('a summary with deviations makes Repeat primary and links each deviation to its item', async ({
  page,
}) => {
  await startProcedure(page, engineStart, 'guided');
  await operateUnrelatedControl(page, unrelatedControl);
  await completeProcedure(page, engineStart);
  const pane = checklistPane(page);

  await expect(pane.getByRole('button', { name: copy.checklist.repeatProcedure })).toHaveClass(
    /button-primary/,
  );
  await pane.getByRole('button', { name: /^Go to item / }).click();
  const items = pane
    .getByRole('region', { name: copy.checklist.itemsHeading })
    .getByRole('listitem');
  await expect(items.first()).toBeFocused();
  await expect(items.first()).toBeInViewport();
});

test('a surprise failure appears unannounced and the debrief times its recognition', async ({
  page,
}) => {
  const failureId = 'alternatorFailure';
  const { title } = procedure(failureId);
  await page.clock.install();
  await openPicker(page);
  await page.getByRole('button', { name: copy.shell.surpriseFailure, exact: true }).click();
  const pane = checklistPane(page);
  await expect(pane.getByText(copy.checklist.surpriseNote)).toBeVisible();
  await expect(page.getByRole('heading', { name: title.en })).toHaveCount(0);
  const lowVolt = aircraft.indicators['lowVoltageLamp']?.name.en ?? 'LOW VOLT';
  const lamp = page.locator(`[data-widget="annunciator"][aria-label^="${lowVolt}"]`);
  await expect(lamp).toHaveAttribute('data-lit', 'false');

  await page.clock.runFor(SURPRISE_MAX_MS + 2000);
  await expect(lamp).toHaveAttribute('data-lit', 'true');
  await expect(page.getByText(copy.checklist.failureInjected)).toHaveCount(0);
  await pane.getByRole('combobox', { name: copy.checklist.showChecklist }).selectOption(failureId);
  await pane.getByRole('button', { name: copy.checklist.runChecklist }).click();
  // Toggles are moved by key: at this viewport the demo toggle's ON target covers its OFF one.
  for (const item of procedure(failureId).items) {
    const row = pane.locator('[aria-current="step"]');
    await expect(row).toContainText(item.text.en);
    if (item.type === 'check') {
      await row.getByRole('button', { name: copy.checklist.checkOff, exact: true }).click();
    } else if (item.type === 'confirm') {
      await row.getByRole('button', { name: copy.checklist.confirm, exact: true }).click();
    } else if (control(item.control).kind === 'toggle') {
      const { positions, name } = control(item.control);
      await page
        .getByRole('radiogroup', { name: name.en, exact: true })
        .getByRole('radio', { checked: true })
        .press(Array.isArray(positions) && positions[0] === item.position ? 'Home' : 'End');
    } else {
      await setControl(page, item.control, item.position);
    }
    await expect(row.getByText(item.text.en)).toHaveCount(0);
  }

  await expect(pane.getByText(copy.checklist.allAsListed)).toBeVisible();
  await expect(pane.getByText(copy.checklist.recognition)).toBeVisible();
  await expect(pane.getByText(copy.checklist.recognisedEarly, { exact: true })).toHaveCount(0);
  await expect(pane.getByText(copy.checklist.chosenEarly)).toHaveCount(0);
  await expect(
    pane.getByText(copy.checklist.surpriseMatched.replace('{failure}', title.en)),
  ).toBeVisible();
});

for (const language of ['en', 'de'] as const) {
  test(`the ${language} drills fit beside the procedures at 1920x1080 once there is history`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const run = { mode: 'practice', deviations: 1, at: 1 };
    await page.addInitScript(
      (history) => localStorage.setItem('cpt.history', history),
      JSON.stringify({ [aircraft.id]: { [engineStart]: { last: run, best: run } } }),
    );
    await openPicker(page);
    await selectLanguage(page, language);
    const shell = language === 'de' ? copyDe.shell : copy.shell;
    for (const name of [shell.practiseNext, shell.randomEmergency, shell.surpriseFailure]) {
      await expect(page.getByRole('button', { name, exact: true })).toBeInViewport({ ratio: 1 });
    }
  });
}

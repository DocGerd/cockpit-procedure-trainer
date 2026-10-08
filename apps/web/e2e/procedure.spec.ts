import { ctslAircraft } from '@cpt/aircraft-ctsl';
import type { Page } from '@playwright/test';
import { control } from './content';
import { expect, test } from './fixtures';
import { openAircraft, selectLanguage } from './legibility';
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

test.describe('Practice recall', () => {
  const texts = procedure(engineStart).items.map((item) => item.text.en);

  test('hiding upcoming items keeps their text out of the page and done items readable', async ({
    page,
  }) => {
    await startProcedure(page, engineStart, 'practice');
    const pane = checklistPane(page);
    await pane.getByRole('checkbox', { name: copy.checklist.hideUpcoming }).check();

    const body = page.locator('body');
    for (const text of texts) await expect(body).not.toContainText(text);

    await pane.getByRole('button', { name: copy.checklist.confirm, exact: true }).click();
    await expect(pane.getByText(texts[0] ?? '')).toBeVisible();
    for (const text of texts.slice(1)) await expect(body).not.toContainText(text);
  });

  test('Show me rings the current target once and adds no deviation cue', async ({ page }) => {
    await startProcedure(page, engineStart, 'practice');
    const pane = checklistPane(page);
    const ring = page.locator('[data-outline="target"]');
    await pane.getByRole('button', { name: copy.checklist.confirm, exact: true }).click();
    await expect(ring).toHaveCount(0);

    await pane.getByRole('button', { name: copy.checklist.showMe }).click();
    await expect(ring).toBeVisible();
    await expect(pane.getByRole('button', { name: copy.checklist.showMe })).toHaveCount(0);
    await expect(page.getByRole('status')).toHaveCount(0);

    await pane.getByRole('button', { name: copy.checklist.checkOff, exact: true }).click();
    await expect(ring).toHaveCount(0);
  });

  test('the summary counts a Show me and names the item', async ({ page }) => {
    await startProcedure(page, engineStart, 'practice');
    const pane = checklistPane(page);
    await pane.getByRole('button', { name: copy.checklist.showMe }).click();
    await completeProcedure(page, engineStart);

    await expect(
      pane.getByText(copy.checklist.assists).locator('xpath=following-sibling::dd'),
    ).toHaveText('1');
    await expect(
      pane.getByRole('region', { name: copy.checklist.assistedHeading }).getByRole('listitem'),
    ).toHaveText(`${copy.checklist.itemNumber.replace('{n}', '1')}${texts[0]}`);
  });
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
  await expect(page.getByRole('button', { name: new RegExp(title) })).toContainText(
    'Last run: 1 deviation, today',
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

test.describe('a CTSL flow', () => {
  const id = 'engineStart';
  const found = ctslAircraft.procedures[id];
  if (!found) throw new Error(`The CTSL has no procedure "${id}"`);
  const { items, startPhase } = found;
  const entry: Readonly<Record<string, unknown>> =
    ctslAircraft.phases[startPhase]?.entry.controls ?? {};
  const flow = items.flatMap((item, index) =>
    item.type === 'action' && item.flow ? [{ index, item }] : [],
  );
  const open = flow.filter(({ item }) => entry[item.control] !== item.position);
  const nameOf = (controlId: string) => ctslAircraft.controls[controlId]?.name.en ?? controlId;
  // Every open flow target here is a two-way switch, so one tap sets it.
  const flip = (page: Page, controlId: string) =>
    page.locator(`button[aria-label^="${nameOf(controlId)}:"]`).click();

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await openAircraft(page, ctslAircraft, id);
  });

  test('Guided rings every open flow target with its number, in any order, then asks to verify', async ({
    page,
  }) => {
    expect(open.length, 'flow items still to do at the start').toBeGreaterThan(1);
    const rings = page.locator('[data-outline="target"]');
    const pane = checklistPane(page);
    await expect(pane.getByRole('list', { name: copy.checklist.flowHeading })).toBeVisible();
    await expect(rings).toHaveCount(open.length);
    expect(await rings.evaluateAll((all) => all.map((ring) => ring.textContent))).toEqual(
      open.map(({ index }) => String(index + 1)),
    );

    for (const [done, { item }] of [...open].reverse().entries()) {
      await flip(page, item.control);
      await expect(rings).toHaveCount(open.length - done - 1);
    }
    await expect(pane.getByText(copy.checklist.flowVerify)).toBeVisible();
    await expect(page.getByRole('status')).not.toContainText(copy.checklist.deviationBanner);
  });

  test('Practice keeps the flow text out of the page until the flow is done', async ({ page }) => {
    await page.getByRole('button', { name: copy.shell.practice, exact: true }).click();
    const pane = checklistPane(page);
    await pane.getByRole('checkbox', { name: copy.checklist.hideUpcoming }).check();
    const body = page.locator('body');
    for (const { item } of flow) await expect(body).not.toContainText(item.text.en);
    await expect(page.locator('[data-outline="target"]')).toHaveCount(0);

    for (const { item } of open) await flip(page, item.control);
    await expect(pane.getByText(copy.checklist.flowVerify)).toBeVisible();
    for (const { item } of flow) await expect(pane.getByText(item.text.en).first()).toBeVisible();
  });
});

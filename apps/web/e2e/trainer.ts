import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import type { ProcedureItem } from '@cpt/core';
import { messages as checklistMessages } from '../src/checklist/messages';
import { messages as errorMessages } from '../src/errors/messages';
import { messages as languageMessages } from '../src/i18n/messages';
import { messages as outsideViewMessages } from '../src/outside-view/messages';
import { messages as shellMessages } from '../src/shell/messages';
import { aircraft, control, procedure, viewOf } from './content';

export const copy = {
  checklist: checklistMessages.en,
  errors: errorMessages.en,
  language: languageMessages.en,
  outsideView: outsideViewMessages.en,
  shell: shellMessages.en,
};

export const copyDe = { shell: shellMessages.de };

export type PickerMode = 'guided' | 'practice';

export async function openPicker(page: Page) {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: copy.shell.pickerTitle })).toBeVisible();
}

/** Start from the picker without waiting for the checklist, which a tablet keeps behind its toggle. */
export async function pickProcedure(page: Page, procedureId: string, mode: PickerMode) {
  await openPicker(page);
  await page.getByRole('button', { name: procedure(procedureId).title.en }).click();
  await page.getByRole('radio', { name: copy.shell[mode] }).check();
  await page.getByRole('button', { name: copy.shell.startProcedure, exact: true }).click();
}

export async function startProcedure(page: Page, procedureId: string, mode: PickerMode) {
  await pickProcedure(page, procedureId, mode);
  await expect(
    page.getByRole('heading', { level: 1, name: procedure(procedureId).title.en }),
  ).toBeVisible();
}

export const checklistPane = (page: Page) =>
  page.getByRole('complementary', { name: copy.shell.checklist });

export const progress = (page: Page) =>
  checklistPane(page).getByRole('progressbar', { name: copy.checklist.progress });

// A group such as a flow is a list item of its own, so rows are counted by their class.
const itemRow = (page: Page, index: number) =>
  checklistPane(page).locator('li.checklist-item').nth(index);

const mark = (row: Locator, name: string | RegExp) => row.getByRole('img', { name });

const summaryHeading = (page: Page, procedureId: string) =>
  page.getByRole('heading', {
    level: 1,
    name: copy.checklist.summaryTitle.replace('{title}', procedure(procedureId).title.en),
  });

/** Bring a view on screen: select its tab, or nothing when every view is already shown. */
export async function showView(page: Page, viewName: string) {
  if ((await page.getByRole('tablist').count()) === 0) return;
  const tab = page.getByRole('tab', { name: viewName });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

const selectView = (page: Page, controlId: string) => showView(page, viewOf(controlId).name.en);

export const deviceDock = (page: Page) => page.getByRole('region', { name: 'Device dock' });

/** The operable unit of an install in the dock; a slot opens it unless Guided already did. */
export async function dockedUnit(page: Page, installId: string, deviceId: string) {
  const held = deviceDock(page).locator(`[data-dock-device="${installId}"]`);
  if ((await held.count()) === 0) {
    await page.locator(`[data-placement="${installId}"]`).getByRole('button').click();
  }
  const unit = deviceDock(page).getByRole('group', { name: deviceId, exact: true });
  await expect(unit).toBeVisible();
  return unit;
}

export async function setControl(page: Page, controlId: string, position: string | number) {
  const definition = control(controlId);
  await selectView(page, controlId);
  const name = definition.name.en;
  if (definition.positions === 'continuous') {
    if (position !== 0 && position !== 1) throw new Error('A lever can only be set to an end stop');
    const slider = page.getByRole('slider', { name, exact: true });
    await slider.focus();
    await slider.press(position === 0 ? 'Home' : 'End');
    return;
  }
  await page
    .getByRole('radiogroup', { name, exact: true })
    .getByRole('radio', { name: String(position), exact: true })
    .click();
}

const springsBack = (controlId: string, position: string | number) => {
  const definition = control(controlId);
  if (definition.kind === 'momentary') return position === definition.positions[1];
  return (
    definition.kind === 'rotary' &&
    definition.springBack !== undefined &&
    Object.hasOwn(definition.springBack, position)
  );
};

function holdTarget(page: Page, controlId: string, position: string | number): Locator {
  const name = control(controlId).name.en;
  return control(controlId).kind === 'momentary'
    ? page.getByRole('button', { name, exact: true })
    : page
        .getByRole('radiogroup', { name, exact: true })
        .getByRole('radio', { name: String(position), exact: true });
}

/** The move `operateUnrelatedControl` makes: out of the initial position into the first other one. */
function unrelatedMove(controlId: string) {
  const definition = control(controlId);
  if (definition.positions === 'continuous') throw new Error('Use a control with named positions');
  const to = definition.positions.find((position) => position !== definition.initial);
  if (to === undefined) throw new Error(`"${controlId}" has only one position`);
  return { from: definition.initial, to };
}

export const deviation = {
  banner: (controlId: string) => {
    const { from, to } = unrelatedMove(controlId);
    return copy.checklist.bannerUnexpected
      .replace('{control}', control(controlId).name.en)
      .replace('{position}', to.toUpperCase())
      .replace('{previous}', from.toUpperCase());
  },
  title: (controlId: string) =>
    copy.checklist.unexpectedTitle.replace('{control}', control(controlId).name.en),
};

/** Operate a control that the running procedure does not ask for, so it logs one deviation. */
export async function operateUnrelatedControl(page: Page, controlId: string) {
  await setControl(page, controlId, unrelatedMove(controlId).to);
}

/** Whether a control with named positions already rests at the position an item asks for. */
async function isSet(page: Page, controlId: string, position: string | number) {
  const definition = control(controlId);
  await selectView(page, controlId);
  if (definition.positions === 'continuous') {
    const slider = page.getByRole('slider', { name: definition.name.en, exact: true });
    return Number(await slider.getAttribute('aria-valuenow')) === position;
  }
  return page
    .getByRole('radiogroup', { name: definition.name.en, exact: true })
    .getByRole('radio', { name: String(position), exact: true })
    .isChecked();
}

const expectDone = (page: Page, procedureId: string, row: Locator) =>
  expect(
    mark(row, /^(Done|Deviated)$/)
      .or(summaryHeading(page, procedureId))
      .first(),
  ).toBeVisible();

async function perform(page: Page, procedureId: string, item: ProcedureItem<unknown>, at: number) {
  const row = itemRow(page, at);
  await expect(mark(row, 'Current')).toBeVisible();
  await expect(row).toContainText(item.text.en);

  if (item.type === 'confirm') {
    await row.getByRole('button', { name: copy.checklist.confirm, exact: true }).click();
  } else if (item.type === 'check') {
    await row.getByRole('button', { name: copy.checklist.checkOff, exact: true }).click();
  } else if (springsBack(item.control, item.position)) {
    await selectView(page, item.control);
    const target = holdTarget(page, item.control, item.position);
    await target.focus();
    await page.keyboard.down('Enter');
    await expectDone(page, procedureId, row);
    await page.keyboard.up('Enter');
  } else if (await isSet(page, item.control, item.position)) {
    await row.getByRole('button', { name: copy.checklist.verify, exact: true }).click();
  } else {
    await setControl(page, item.control, item.position);
  }

  await expectDone(page, procedureId, row);
}

/** Work through every item of the running procedure, in order, until the summary shows. */
export async function completeProcedure(page: Page, procedureId: string) {
  const { items } = procedure(procedureId);
  for (const [at, item] of items.entries()) {
    await perform(page, procedureId, item, at);
  }
  await expect(summaryHeading(page, procedureId)).toBeVisible();
}

export { aircraft, procedure };

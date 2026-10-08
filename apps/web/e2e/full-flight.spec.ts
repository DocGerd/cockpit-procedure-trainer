import { ctslAircraft } from '@cpt/aircraft-ctsl';
import { flightLegs } from '@cpt/core';
import type { Page } from '@playwright/test';
import { control } from './content';
import { expect, test } from './fixtures';
import { flightPlan, flyLeg } from './flight';
import {
  aircraft,
  checklistPane,
  completeProcedure,
  copy,
  openPicker,
  procedure,
  setControl,
} from './trainer';

const continueWith = (page: Page, title: string) =>
  checklistPane(page)
    .getByRole('button', { name: copy.checklist.nextProcedure.replace('{title}', title) })
    .click();

test('a full flight carries a control the pilot set into the next leg', async ({ page }) => {
  const legs = flightLegs(aircraft);
  const [first, second, third] = legs;
  if (!first || !second || !third) throw new Error('The demo needs three legs');
  const held = procedure(second).startPhase;
  expect(procedure(third).startPhase, 'the carried pair shares its phase').toBe(held);

  await openPicker(page);
  await page.getByRole('button', { name: copy.shell.fullFlight, exact: true }).click();
  const phase = page.getByLabel(copy.outsideView.phase, { exact: true });
  await completeProcedure(page, first);
  await continueWith(page, procedure(second).title.en);
  await expect(phase).toHaveValue(held);
  await completeProcedure(page, second);

  await setControl(page, 'annunciator', 'dim');
  await continueWith(page, procedure(third).title.en);
  await expect(
    page.getByRole('heading', { level: 1, name: procedure(third).title.en }),
  ).toBeVisible();
  await expect(phase).toHaveValue(held);
  expect(aircraft.phases[held]?.entry.controls['annunciator']).not.toBe('dim');
  await expect(
    page
      .getByRole('radiogroup', { name: control('annunciator').name.en, exact: true })
      .getByRole('radio', { name: 'dim', exact: true }),
  ).toBeChecked();
});

test('the CTSL full flight runs from cold and dark to securing without a deviation', async ({
  page,
}) => {
  test.setTimeout(3 * 60_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const plan = flightPlan(ctslAircraft);
  await page.clock.install();
  await openPicker(page);
  await page.getByRole('button', { name: ctslAircraft.name.en }).click();
  await page.getByRole('radio', { name: copy.shell.guided }).check();
  // Paused, the session advances only by the plan's runFor, tick for tick with the shadow, so
  // a slow runner cannot give the cockpit extra time.
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1_000);
  await page.getByRole('button', { name: copy.shell.fullFlight, exact: true }).click();
  const phase = page.getByLabel(copy.outsideView.phase, { exact: true });
  const pane = checklistPane(page);

  for (const [index, leg] of plan.entries()) {
    const definition = ctslAircraft.procedures[leg.id];
    if (!definition) throw new Error(`no leg ${leg.id}`);
    await expect(phase).toHaveValue(definition.startPhase);
    await expect(pane.locator('.checklist-flight-leg')).toHaveText(
      copy.checklist.flightLeg
        .replace('{n}', String(index + 1))
        .replace('{total}', String(plan.length)),
    );
    await flyLeg(page, ctslAircraft, leg);
    await expect(
      pane.getByRole('heading', {
        level: 1,
        name: copy.checklist.summaryTitle.replace('{title}', definition.title.en),
      }),
    ).toBeVisible();
    expect(await pane.locator('.checklist-deviation').allInnerTexts(), leg.id).toEqual([]);
    await expect(phase).toHaveValue(definition.endPhase ?? definition.startPhase);
    const next = plan[index + 1];
    if (next) {
      await continueWith(page, ctslAircraft.procedures[next.id]?.title.en ?? next.id);
    }
  }

  const total = pane
    .getByRole('region', { name: copy.checklist.flightHeading })
    .locator('tfoot td')
    .first();
  await expect(total).toHaveText('0');
});

test('Back to selection on a leg summary asks before ending the full flight', async ({ page }) => {
  const legs = flightLegs(aircraft);
  const [first, second] = legs;
  if (!first || !second) throw new Error('The demo needs two legs');
  await openPicker(page);
  await page.getByRole('button', { name: copy.shell.fullFlight, exact: true }).click();
  await completeProcedure(page, first);
  await continueWith(page, procedure(second).title.en);
  await completeProcedure(page, second);
  const pane = checklistPane(page);
  const back = pane.getByRole('button', { name: copy.checklist.backToSelection });
  await back.click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText(`2 of ${legs.length} legs`);
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await expect(back).toBeVisible();
  await back.click();
  await dialog.getByRole('button', { name: copy.checklist.backToSelection }).click();
  await expect(
    page.getByRole('button', { name: copy.shell.fullFlight, exact: true }),
  ).toBeVisible();
});

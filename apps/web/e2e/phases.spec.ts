import { phaseOrder, sharedPhases } from '@cpt/core';
import type { Page } from '@playwright/test';
import { aircraftRegistry } from '../src/aircraft-registry';
import { expect, test } from './fixtures';
import { openAircraft } from './legibility';
import { copy } from './trainer';

const phaseSelect = (page: Page) => page.getByLabel(copy.outsideView.phase, { exact: true });
const outsideImage = (page: Page) =>
  page.getByRole('region', { name: copy.shell.outsideView }).getByRole('img');

test.use({ viewport: { width: 1920, height: 1080 } });

for (const aircraft of aircraftRegistry) {
  test(`${aircraft.id}: the phase control lists the shared phases in flight order`, async ({
    page,
  }) => {
    await openAircraft(page, aircraft);
    const options = phaseSelect(page).locator('option');
    await expect(options).toHaveCount(phaseOrder.length);
    expect(
      await options.evaluateAll((all) => all.map((o) => (o as HTMLOptionElement).value)),
    ).toEqual(phaseOrder);
    await expect(options).toHaveText(sharedPhases.map(({ name }) => name.en));
  });
}

test('demo: jumping to taxi out, where no procedure starts, loads its view', async ({ page }) => {
  const demo = aircraftRegistry.find(({ id }) => id === 'demo');
  if (!demo) throw new Error('The demo aircraft is not registered');
  expect(Object.values(demo.procedures).some(({ startPhase }) => startPhase === 'taxiOut')).toBe(
    false,
  );
  await openAircraft(page, demo);
  await phaseSelect(page).selectOption('taxiOut');
  await expect(phaseSelect(page)).toHaveValue('taxiOut');
  await expect(outsideImage(page)).toHaveAttribute('src', /phase-taxi-out/);
  await expect
    .poll(() => outsideImage(page).evaluate((element: HTMLImageElement) => element.naturalWidth))
    .toBeGreaterThan(0);
});

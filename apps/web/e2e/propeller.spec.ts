import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { aircraftRegistry } from '../src/aircraft-registry';
import { openAircraft } from './legibility';
import { completeProcedure, copy, startProcedure } from './trainer';

const outsideImage = (page: Page) =>
  page.getByRole('region', { name: copy.shell.outsideView }).getByRole('img');

const expectImage = async (page: Page, running: boolean) => {
  const image = outsideImage(page);
  if (running) await expect(image).toHaveAttribute('src', /-running/);
  else await expect(image).not.toHaveAttribute('src', /-running/);
  await expect
    .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
    .toBeGreaterThan(0);
};

for (const aircraft of aircraftRegistry) {
  test(`${aircraft.id}: the outside view shows the propeller disc in a phase with the engine running`, async ({
    page,
  }) => {
    await openAircraft(page, aircraft, 'engineStart');
    await expectImage(page, false);

    const running = Object.values(aircraft.phases).find(({ entry }) =>
      aircraft.engineRunning?.({ controls: entry.controls, systems: entry.state, devices: {} }),
    );
    if (!running)
      throw new Error(`${aircraft.id} has no phase that starts with the engine running`);
    await page
      .getByLabel(copy.outsideView.phase, { exact: true })
      .selectOption({ label: running.name.en });
    await expectImage(page, true);
  });
}

test('starting the engine swaps the blade for the disc', async ({ page }) => {
  await startProcedure(page, 'engineStart', 'guided');
  await expectImage(page, false);

  await completeProcedure(page, 'engineStart');
  await expectImage(page, true);
});

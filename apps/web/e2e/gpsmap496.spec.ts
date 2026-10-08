import { readFileSync } from 'node:fs';
import { ctslAircraft } from '@cpt/aircraft-ctsl';
import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import { copy, openPicker } from './trainer';

const procedure = ctslAircraft.procedures.radioAndTransponder;
if (!procedure) throw new Error('The CTSL has no radioAndTransponder');
const procedureTitle = procedure.title.en;

const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const TOUCH_TARGET_PX = Number(/--size-target:\s*(\d+)px/.exec(tokens)?.[1]);
if (!Number.isFinite(TOUCH_TARGET_PX)) throw new Error('tokens.css has no --size-target');
const viewports = [
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
];

async function openInDock(page: Page, title = procedureTitle) {
  await openPicker(page);
  await page.getByRole('button', { name: ctslAircraft.name.en }).click();
  await page.getByRole('button', { name: title }).click();
  await page.getByRole('radio', { name: copy.shell.guided }).check();
  await page.getByRole('button', { name: copy.shell.startProcedure, exact: true }).click();
  await page.locator('[data-placement="gps"]').getByRole('button').click();
  const dock = page.getByRole('region', { name: 'Device dock' });
  return dock.getByRole('group', { name: 'gpsmap496', exact: true });
}

for (const viewport of viewports) {
  test(`every GPSMAP 496 control is at least 44 px at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const unit = await openInDock(page);
    const buttons = unit.getByRole('button');
    expect(await buttons.count()).toBe(4);

    const sizes = await buttons.evaluateAll((elements) =>
      elements.map((element) => {
        const { width, height } = element.getBoundingClientRect();
        return { name: element.textContent ?? '', width, height };
      }),
    );
    const smallest = Math.min(...sizes.flatMap(({ width, height }) => [width, height]));
    test.info().annotations.push({
      type: 'smallest touch target',
      description: `${smallest.toFixed(1)} px`,
    });
    for (const size of sizes) {
      expect(size.width, `${size.name} width`).toBeGreaterThanOrEqual(TOUCH_TARGET_PX);
      expect(size.height, `${size.name} height`).toBeGreaterThanOrEqual(TOUCH_TARGET_PX);
    }
  });
}

test('the GPSMAP 496 is operated from the device dock', async ({ page }) => {
  const unit = await openInDock(page);
  const display = unit.locator('[data-display]');
  await expect(display).toHaveText('');

  await unit.getByRole('button', { name: 'POWER', exact: true }).click();
  await expect(display).toContainText('MAP');
  await expect(display).toContainText('ACQUIRING');
  await unit.getByRole('button', { name: 'PAGE', exact: true }).click();
  await expect(display).toContainText('TERRAIN');
  await unit.getByRole('button', { name: 'QUIT', exact: true }).click();
  await expect(display).toContainText('MAP');
  await unit.getByRole('button', { name: 'LIGHT', exact: true }).click();
  await expect(display).toContainText('LIGHT 3/3');
  await unit.getByRole('button', { name: 'POWER', exact: true }).click();
  await expect(display).toHaveText('');
});

test('the GPSMAP 496 shows a position fix, ground speed and track in cruise', async ({ page }) => {
  const descent = ctslAircraft.procedures.descent;
  if (descent?.startPhase !== 'cruise')
    throw new Error('The CTSL descent no longer starts in cruise');
  const cruise = ctslAircraft.phases.cruise;
  if (!cruise) throw new Error('The CTSL has no cruise phase');
  const { airspeedKt } = cruise.environment;
  const { headingDeg } = cruise.entry.state as { headingDeg: number };
  const track = String(headingDeg).padStart(3, '0');
  const unit = await openInDock(page, descent.title.en);
  const mirror = page.locator('[data-placement="gps"] [data-device-mirror]');
  await expect(mirror.locator('[data-field="speed"]')).toHaveText(`GS ${airspeedKt}KT`);
  await expect(mirror.locator('[data-field="track"]')).toHaveText(`TRK ${track}°`);
  await expect(mirror.locator('[data-field="map"]')).toBeVisible();
  const display = unit.locator('[data-display]');
  await expect(display).toContainText(`GS ${airspeedKt}KT`);
  await expect(display.locator('[data-field="map"]')).toBeVisible();
});

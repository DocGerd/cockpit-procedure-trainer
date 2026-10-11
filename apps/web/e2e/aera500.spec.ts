import { readFileSync } from 'node:fs';
import { ctslAircraft } from '@cpt/aircraft-ctsl';
import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import { copy, dockedUnit, openPicker } from './trainer';

const beforeTakeoff = ctslAircraft.procedures.beforeTakeoff;
if (beforeTakeoff?.startPhase !== 'holding') throw new Error('The CTSL has no beforeTakeoff');

const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const TOUCH_TARGET_PX = Number(/--size-target:\s*(\d+)px/.exec(tokens)?.[1]);
if (!Number.isFinite(TOUCH_TARGET_PX)) throw new Error('tokens.css has no --size-target');
const viewports = [
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
];

async function openInDock(page: Page, title = beforeTakeoff?.title.en ?? '') {
  await openPicker(page);
  await page.getByRole('button', { name: ctslAircraft.name.en }).click();
  await page.getByRole('button', { name: title }).click();
  await page.getByRole('radio', { name: copy.shell.practice }).check();
  await page.getByRole('button', { name: copy.shell.startProcedure, exact: true }).click();
  return dockedUnit(page, 'gps', 'aera500');
}

const touchTargets = async (page: Page) => {
  const unit = await openInDock(page);
  const sizes = await unit.getByRole('button').evaluateAll((elements) =>
    elements.map((element) => {
      const { width, height } = element.getBoundingClientRect();
      return { name: element.textContent ?? '', width, height };
    }),
  );
  return { unit, sizes };
};

for (const viewport of viewports) {
  test(`every aera 500 control is at least 44 px at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const { unit, sizes } = await touchTargets(page);
    expect(sizes.map(({ name }) => name)).toEqual(['POWER', 'Press To Accept']);
    await unit.getByRole('button', { name: 'Press To Accept', exact: true }).click();
    const home = await unit.getByRole('button').evaluateAll((elements) =>
      elements.map((element) => {
        const { width, height } = element.getBoundingClientRect();
        return { name: element.textContent ?? '', width, height };
      }),
    );
    expect(home).toHaveLength(7);
    for (const size of [...sizes, ...home]) {
      expect(size.width, `${size.name} width`).toBeGreaterThanOrEqual(TOUCH_TARGET_PX);
      expect(size.height, `${size.name} height`).toBeGreaterThanOrEqual(TOUCH_TARGET_PX);
    }
  });
}

test('the aera 500 starts with cradle power, accepts its databases and opens its map', async ({
  page,
}) => {
  const unit = await openInDock(page);
  const display = unit.locator('[data-display]');
  await expect(display.locator('[data-page="startup"]')).toBeVisible();

  await unit.getByRole('button', { name: 'Press To Accept', exact: true }).click();
  await expect(display.locator('[data-page="home"]')).toBeVisible();
  await unit.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(display.locator('[data-page="map"]')).toBeVisible();
  await expect(display.locator('[data-field="range"]')).toHaveText('5NM');
  await unit.getByRole('button', { name: 'In', exact: true }).click();
  await expect(display.locator('[data-field="range"]')).toHaveText('2NM');
  await unit.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(display.locator('[data-page="home"]')).toBeVisible();
});

test('the aera 500 shows a position fix and ground speed on its map in cruise', async ({
  page,
}) => {
  const descent = ctslAircraft.procedures.descent;
  if (descent?.startPhase !== 'cruise')
    throw new Error('The CTSL descent no longer starts in cruise');
  const cruise = ctslAircraft.phases.cruise;
  if (!cruise) throw new Error('The CTSL has no cruise phase');
  const { airspeedKt } = cruise.environment;
  const unit = await openInDock(page, descent.title.en);
  const mirror = page.locator('[data-placement="gps"] [data-device-mirror]');
  await expect(mirror.locator('[data-page="map"]')).toBeVisible();
  await expect(mirror.locator('[data-field="speed"]')).toHaveText(`GS ${airspeedKt}KT`);
  await expect(mirror.locator('[data-field="unknown"]')).toHaveCount(0);
  const display = unit.locator('[data-display]');
  await expect(display.locator('[data-field="speed"]')).toHaveText(`GS ${airspeedKt}KT`);
});

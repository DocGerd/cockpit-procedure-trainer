import { readFileSync } from 'node:fs';
import { ctslAircraft } from '@cpt/aircraft-ctsl';
import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import { copy, dockedUnit, openPicker } from './trainer';

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

async function openInDock(page: Page) {
  await openPicker(page);
  await page.getByRole('button', { name: ctslAircraft.name.en }).click();
  await page.getByRole('button', { name: procedureTitle }).click();
  await page.getByRole('radio', { name: copy.shell.practice }).check();
  await page.getByRole('button', { name: copy.shell.startProcedure, exact: true }).click();
  return dockedUnit(page, 'com', 'atr833');
}

for (const viewport of viewports) {
  test(`every ATR833 control is at least 44 px at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const unit = await openInDock(page);
    const buttons = unit.getByRole('button');
    expect(await buttons.count()).toBe(10);

    const sizes = await buttons.evaluateAll((elements) =>
      elements.map((element) => {
        const { width, height } = element.getBoundingClientRect();
        return { name: element.textContent ?? '', width, height };
      }),
    );
    for (const size of sizes) {
      expect(size.width, `${size.name} width`).toBeGreaterThanOrEqual(TOUCH_TARGET_PX);
      expect(size.height, `${size.name} height`).toBeGreaterThanOrEqual(TOUCH_TARGET_PX);
    }
  });
}

test('the ATR833 is on with the avionics bus and swaps a raised standby frequency to active', async ({
  page,
}) => {
  const unit = await openInDock(page);
  const display = unit.locator('[data-display]');
  const mirror = page.locator('[data-placement="com"] [data-device-mirror]');
  await expect(display.locator('[data-field="active"]')).toHaveText('118.000');
  await expect(display.locator('[data-field="standby"]')).toHaveText('119.000');

  await unit.getByRole('button', { name: 'FREQ +', exact: true }).click();
  await expect(display.locator('[data-field="standby"]')).toHaveText('120.000');
  await unit.getByRole('button', { name: 'SWAP', exact: true }).click();
  await expect(display.locator('[data-field="active"]')).toHaveText('120.000');
  await expect(display.locator('[data-field="standby"]')).toHaveText('118.000');
  await expect(mirror.locator('[data-field="active"]')).toHaveText('120.000');
});

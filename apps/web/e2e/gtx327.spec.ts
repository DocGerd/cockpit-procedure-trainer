import { readFileSync } from 'node:fs';
import { ctslAircraft } from '@cpt/aircraft-ctsl';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { copy, openPicker } from './trainer';

const procedure = ctslAircraft.procedures.radioAndTransponder;
const radios = ctslAircraft.views.radios;
if (!procedure || !radios) throw new Error('The CTSL has no radioAndTransponder or radio stack');
const procedureTitle = procedure.title.en;
const radiosTab = radios.name.en;

const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const TOUCH_TARGET_PX = Number(/--size-target:\s*(\d+)px/.exec(tokens)?.[1]);
if (!Number.isFinite(TOUCH_TARGET_PX)) throw new Error('tokens.css has no --size-target');
const viewports = [
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
];

async function openRadioStack(page: Page) {
  await openPicker(page);
  await page.getByRole('button', { name: ctslAircraft.name.en }).click();
  await page.getByRole('button', { name: procedureTitle }).click();
  await page.getByRole('radio', { name: copy.shell.guided }).check();
  await page.getByRole('button', { name: copy.shell.startProcedure, exact: true }).click();
  const tab = page.getByRole('tab', { name: radiosTab });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  return page.getByRole('group', { name: 'gtx327', exact: true });
}

for (const viewport of viewports) {
  test(`every GTX 327 control is at least 44 px at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const unit = await openRadioStack(page);
    const buttons = unit.getByRole('button');
    expect(await buttons.count()).toBe(20);

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

test('the GTX 327 is operated from the radio stack', async ({ page }) => {
  const unit = await openRadioStack(page);
  const display = unit.locator('[data-display]');

  await unit.getByRole('button', { name: 'SBY', exact: true }).click();
  await unit.getByRole('button', { name: '1', exact: true }).click();
  await unit.getByRole('button', { name: '2', exact: true }).click();
  await expect(display).toContainText('12__');
  await unit.getByRole('button', { name: 'VFR', exact: true }).click();
  await expect(display).toContainText('7000');
  await unit.getByRole('button', { name: 'ALT', exact: true }).click();
  await expect(display).toContainText('ALT');
  await unit.getByRole('button', { name: 'IDENT', exact: true }).click();
  await expect(display).toContainText('IDENT');
});

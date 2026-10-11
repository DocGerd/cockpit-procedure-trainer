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
  return dockedUnit(page, 'xpdr', 'trt800h');
}

for (const viewport of viewports) {
  test(`every TRT800H control is at least 44 px at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const unit = await openInDock(page);
    const buttons = unit.getByRole('button');
    expect(await buttons.count()).toBe(8);

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

test('the TRT800H switches on in standby, squawks VFR and reports its level at ACS', async ({
  page,
}) => {
  const unit = await openInDock(page);
  const display = unit.locator('[data-display]');
  const field = (name: string) => display.locator(`[data-field="${name}"]`);
  await expect(field('code')).toHaveText('');

  await unit.getByRole('button', { name: 'I/O', exact: true }).click();
  await expect(field('status')).toHaveText('STBY');
  await expect(field('code')).toHaveText('2000');
  await unit.getByRole('button', { name: 'VFR', exact: true }).click();
  await expect(field('code')).toHaveText('7000');
  await expect(field('standby')).toHaveText('VFR');
  await unit.getByRole('button', { name: 'MODE', exact: true }).click();
  await expect(field('mode')).toHaveText('ACS');
  await expect(field('status')).toHaveText('');
  await expect(field('level')).toHaveText('FL 000');
  const mirror = page.locator('[data-placement="xpdr"] [data-device-mirror]');
  await expect(mirror.locator('[data-field="mode"]')).toHaveText('ACS');
  await expect(mirror.locator('[data-field="code"]')).toHaveText('7000');
});

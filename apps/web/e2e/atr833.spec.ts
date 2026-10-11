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
  { width: 1920, height: 1080 },
  { width: 3840, height: 2160 },
];

async function openInDock(page: Page) {
  await openPicker(page);
  await page.getByRole('button', { name: ctslAircraft.name.en }).click();
  await page.getByRole('button', { name: procedureTitle }).click();
  await page.getByRole('radio', { name: copy.shell.practice }).check();
  await page.getByRole('button', { name: copy.shell.startProcedure, exact: true }).click();
  return dockedUnit(page, 'com', 'atr833');
}

type Box = { name: string; left: number; top: number; right: number; bottom: number };

const overlap = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

// The panel scales the dock, so edges that coincide in CSS can differ by a fraction of a pixel.
const SUBPIXEL = 0.5;
const inside = (inner: Box, outer: Box) =>
  inner.left >= outer.left - SUBPIXEL &&
  inner.top >= outer.top - SUBPIXEL &&
  inner.right <= outer.right + SUBPIXEL &&
  inner.bottom <= outer.bottom + SUBPIXEL;

for (const viewport of viewports) {
  test(`every ATR833 control is a separate touch target of at least 44 px at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const unit = await openInDock(page);
    const layout = await unit.evaluate((root) => {
      const box = (element: Element | null, name = ''): Box => {
        if (!element) throw new Error(`no ${name}`);
        const { left, top, right, bottom } = element.getBoundingClientRect();
        return {
          name: element.getAttribute('aria-label') ?? element.textContent ?? name,
          left,
          top,
          right,
          bottom,
        };
      };
      return {
        screen: box(root.querySelector('[data-helper-column]')?.parentElement ?? null, 'screen'),
        face: box(root.querySelector('[data-atr833-face]'), 'face'),
        window: box(root.querySelector('[data-display]'), 'window'),
        column: box(root.querySelector('[data-helper-column]'), 'helper column'),
        keys: [...root.querySelectorAll('.pk-face-key')].map((element) => box(element)),
        helpers: [...root.querySelectorAll('.pk-knob-helper')].map((element) => box(element)),
      };
    });
    expect(layout.keys).toHaveLength(6);
    expect(layout.helpers).toHaveLength(4);

    const buttons = [...layout.keys, ...layout.helpers];
    for (const [index, button] of buttons.entries()) {
      expect(button.right - button.left, `${button.name} width`).toBeGreaterThanOrEqual(
        TOUCH_TARGET_PX,
      );
      expect(button.bottom - button.top, `${button.name} height`).toBeGreaterThanOrEqual(
        TOUCH_TARGET_PX,
      );
      expect(inside(button, layout.screen), `${button.name} inside the unit box`).toBe(true);
      for (const other of buttons.slice(index + 1)) {
        expect(overlap(button, other), `${button.name} / ${other.name}`).toBe(false);
      }
    }
    for (const key of layout.keys) {
      expect(inside(key, layout.face), `${key.name} inside the disc square`).toBe(true);
      expect(overlap(key, layout.window), `${key.name} off the display`).toBe(false);
    }
    for (const helper of layout.helpers) {
      expect(inside(helper, layout.column), `${helper.name} in the helper column`).toBe(true);
      expect(overlap(helper, layout.face), `${helper.name} off the unit`).toBe(false);
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

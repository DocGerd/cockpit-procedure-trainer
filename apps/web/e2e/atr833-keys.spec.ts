import { ctslAircraft } from '@cpt/aircraft-ctsl';
import { expect, test } from './fixtures';
import type { Locator, Page } from '@playwright/test';
import { copy, dockedUnit, openPicker } from './trainer';

const procedure = ctslAircraft.procedures.radioAndTransponder;
if (!procedure) throw new Error('The CTSL has no radioAndTransponder');
const procedureTitle = procedure.title.en;

async function openInDock(page: Page) {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openPicker(page);
  await page.getByRole('button', { name: ctslAircraft.name.en }).click();
  await page.getByRole('button', { name: procedureTitle }).click();
  await page.getByRole('radio', { name: copy.shell.practice }).check();
  await page.getByRole('button', { name: copy.shell.startProcedure, exact: true }).click();
  return dockedUnit(page, 'com', 'atr833');
}

const readout = (unit: Locator) => {
  const display = unit.locator('[data-display]');
  return {
    active: display.locator('[data-field="active"]'),
    standby: display.locator('[data-field="standby"]'),
    line3: display.locator('[data-field="line3"]'),
    standbyLabel: display.locator('[data-line-label]').nth(1),
  };
};

const keyOf = (unit: Locator, name: string) => unit.getByRole('button', { name, exact: true });

async function centre(key: Locator) {
  const box = await key.boundingBox();
  if (!box) throw new Error('The key has no box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe('ATR833 keys pressed with a mouse', () => {
  test('swap and dual watch keep their effect after the button comes up', async ({ page }) => {
    const unit = await openInDock(page);
    const lines = readout(unit);

    const press = async (name: string, whileDown: () => Promise<void>) => {
      const at = await centre(keyOf(unit, name));
      await page.mouse.move(at.x, at.y);
      await page.mouse.down();
      await whileDown();
      await page.mouse.up();
    };

    await press('SWAP', () => expect(lines.active).toHaveText('119.000'));
    await expect(lines.active).toHaveText('119.000');
    await expect(lines.standby).toHaveText('118.000');

    await press('DW', () => expect(lines.standbyLabel).toHaveText('DW'));
    await expect(lines.standbyLabel).toHaveText('DW');
  });
});

test.describe('ATR833 keys tapped on a touch screen', () => {
  test('a tap acts once on each key and knob helper', async ({ page }) => {
    const unit = await openInDock(page);
    const lines = readout(unit);
    const session = await page.context().newCDPSession(page);
    const tap = async (name: string) => {
      const at = await centre(keyOf(unit, name));
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [at] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };

    await tap('SWAP');
    await expect(lines.active).toHaveText('119.000');
    await expect(lines.standby).toHaveText('118.000');

    await tap('DW');
    await expect(lines.standbyLabel).toHaveText('DW');

    await tap('FREQ +');
    await expect(lines.standby).toHaveText('119.000');
    await expect(lines.active).toHaveText('119.000');

    await tap('CURSOR');
    await tap('FREQ +');
    await expect(lines.standby).toHaveText('119.100');

    await tap('SET');
    await expect(lines.line3).toHaveText('SQL 05');

    await tap('MEM');
    await expect(lines.line3).toHaveText('MEM 00');
    await session.detach();
  });

  test('a SET held past the long press returns line 3 to VOL', async ({ page }) => {
    const unit = await openInDock(page);
    const lines = readout(unit);
    const session = await page.context().newCDPSession(page);
    const at = await centre(keyOf(unit, 'SET'));
    const touch = (type: 'touchStart' | 'touchEnd') =>
      session.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchStart' ? [at] : [],
      });

    await touch('touchStart');
    await touch('touchEnd');
    await expect(lines.line3).toHaveText('SQL 05');

    await touch('touchStart');
    await expect(lines.line3).toHaveText('VOL 10');
    await touch('touchEnd');
    await expect(lines.line3).toHaveText('VOL 10');
    await session.detach();
  });
});

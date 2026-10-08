import { ctslAircraft } from '@cpt/aircraft-ctsl';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { aircraftRegistry } from '../src/aircraft-registry';
import { priorityViewports } from './layout-probe';
import { fitViewAt, openAircraft, showView } from './legibility';

/** Position buttons whose own centre is not what a tap there reaches. */
async function shadowedPositions(root: Locator): Promise<string[]> {
  return root.locator('[role="radiogroup"]').evaluateAll((groups) =>
    groups.flatMap((group) => {
      const placement = group.closest('[data-placement]')?.getAttribute('data-placement') ?? '';
      return [...group.querySelectorAll('button[role="radio"]')].flatMap((button, index) => {
        const { left, right, top, bottom, width } = button.getBoundingClientRect();
        if (width === 0) return [];
        const hit = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
        return hit === button ? [] : [`${placement} position ${index + 1} (${button.ariaLabel})`];
      });
    }),
  );
}

for (const aircraft of aircraftRegistry) {
  for (const viewport of priorityViewports) {
    test(`${aircraft.id} position targets are each reachable at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openAircraft(page, aircraft);
      for (const viewId of Object.keys(aircraft.views)) {
        const root = await showView(page, aircraft, viewId, 'en');
        expect(await shadowedPositions(root), viewId).toEqual([]);
        for (const [id, definition] of Object.entries(aircraft.controls)) {
          const held = definition.kind === 'rotary' ? Object.keys(definition.springBack ?? {}) : [];
          const positions = definition.positions === 'continuous' ? [] : definition.positions;
          const group = root.locator(`[data-placement="${id}"]`).getByRole('radiogroup');
          if ((await group.count()) === 0) continue;
          const radios = await group.getByRole('radio').all();
          for (const [index, radio] of radios.entries()) {
            const position = positions[index] ?? '';
            if (held.includes(position)) continue;
            await radio.click();
            await expect(radio, `${id} ${position}`).toBeChecked();
          }
        }
      }
    });
  }
  for (const [viewId, cell] of Object.entries(aircraft.cockpit?.views ?? {})) {
    test(`${aircraft.id} ${viewId} position targets are each reachable at the floor`, async ({
      page,
    }) => {
      await openAircraft(page, aircraft);
      const root = await showView(page, aircraft, viewId, 'en');
      await fitViewAt(page, viewId, cell.minWidth);
      expect(await shadowedPositions(root), viewId).toEqual([]);
    });
  }
}

/** The placement whose widget answers a tap at a fraction of another placement's box. */
async function ownerAt(page: Page, placement: string, x: number, y: number) {
  return page.evaluate(
    ([id, fx, fy]) => {
      const rect = document.querySelector(`[data-placement="${id}"]`)?.getBoundingClientRect();
      if (!rect) return null;
      const hit = document.elementFromPoint(
        rect.left + rect.width * Number(fx),
        rect.top + rect.height * Number(fy),
      );
      return hit?.closest('[data-placement]')?.getAttribute('data-placement') ?? null;
    },
    [placement, x, y] as const,
  );
}

test('the CTSL fuel valve covers the key slot only while closed and always owns its own slot', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openAircraft(page, ctslAircraft, 'engineStart');
  await showView(page, ctslAircraft, 'centre', 'en');
  const valve = page.locator('[data-placement="fuelValve"] button');
  const keyPoints = [0.2, 0.5, 0.8].flatMap((x) => [0.15, 0.5, 0.85].map((y) => [x, y] as const));

  await expect(valve).toHaveAttribute('aria-label', /: closed$/i);
  expect(await ownerAt(page, 'fuelValve', 0.5, 0.2)).toBe('fuelValve');
  expect(await ownerAt(page, 'ignition', 0.5, 0.15)).toBe('fuelValve');

  const slot = await page.locator('[data-placement="fuelValve"]').boundingBox();
  if (!slot) throw new Error('the fuel valve is not on screen');
  await page.mouse.click(slot.x + slot.width * 0.5, slot.y + slot.height * 0.2);
  await expect(valve).toHaveAttribute('aria-label', /: open$/i);
  expect(await ownerAt(page, 'fuelValve', 0.5, 0.2)).toBe('fuelValve');
  for (const [x, y] of keyPoints) {
    expect(await ownerAt(page, 'ignition', x, y), `key at ${x} ${y}`).toBe('ignition');
  }
});

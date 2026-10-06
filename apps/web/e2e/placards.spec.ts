import type { Aircraft } from '@cpt/core';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { aircraftRegistry } from '../src/aircraft-registry';
import { copy, openPicker } from './trainer';

const viewports = [
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

const MIN_TEXT_PX = 11;

type Language = 'en' | 'de';

const widgetPlacards = (aircraft: Aircraft, viewId: string, language: Language) =>
  Object.entries(aircraft.views[viewId]?.controls ?? {}).flatMap(([id, placement]) => {
    const control = aircraft.controls[id];
    if (!control || !placement || (placement.printed?.length ?? 0) > 0) return [];
    if (control.appearance && 'artwork' in control.appearance) return [];
    return [{ id, text: (control.placard ?? control.name)[language].toUpperCase() }];
  });

async function openAircraft(page: Page, aircraft: Aircraft) {
  const first = Object.values(aircraft.procedures).find(({ type }) => type === 'normal');
  if (!first) throw new Error(`${aircraft.id} has no normal procedure`);
  await openPicker(page);
  await page.getByRole('button', { name: aircraft.name.en }).click();
  await page.getByRole('button', { name: first.title.en }).click();
  await page.getByRole('radio', { name: copy.shell.guided }).check();
  await page.getByRole('button', { name: copy.shell.startProcedure, exact: true }).click();
}

const runs = aircraftRegistry.flatMap((aircraft) =>
  viewports.flatMap((viewport) =>
    (['en', 'de'] as const).map((language) => ({ aircraft, viewport, language })),
  ),
);

for (const { aircraft, viewport, language } of runs) {
  test(`${aircraft.id} prints a legible ${language} placard on every widget control at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openAircraft(page, aircraft);
    if (language === 'de') await page.getByRole('button', { name: copy.language.german }).click();
    for (const [viewId, view] of Object.entries(aircraft.views)) {
      const expected = widgetPlacards(aircraft, viewId, language);
      if (expected.length === 0) continue;
      const tab = page.getByRole('tab', { name: view.name[language] });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      for (const { id, text } of expected) {
        const placement = page.locator(`[data-placement="${id}"]`);
        const placard = placement.locator('[data-placard]');
        await expect(placard, `${viewId}/${id}`).toHaveText(text);
        const geometry = await placement.evaluate((element) => {
          const box = (target: Element | null) => {
            const rect = target?.getBoundingClientRect();
            return (
              rect && { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }
            );
          };
          const label = element.querySelector('[data-placard]');
          return {
            placement: box(element),
            label: box(label),
            moving: [...element.querySelectorAll('.pk-move')].map(box),
            fontPx: label ? Number.parseFloat(getComputedStyle(label).fontSize) : 0,
            scale: (() => {
              const svg = element.querySelector('svg');
              const width = svg?.viewBox.baseVal.width ?? 0;
              return width > 0 ? (svg?.getBoundingClientRect().width ?? 0) / width : 0;
            })(),
          };
        });
        const { placement: outer, label, moving, fontPx, scale } = geometry;
        if (!outer || !label) throw new Error(`${viewId}/${id} has no placard box`);
        expect(fontPx * scale, `${viewId}/${id} text size`).toBeGreaterThanOrEqual(
          MIN_TEXT_PX - 0.5,
        );
        expect(label.left, `${viewId}/${id} inside its placement`).toBeGreaterThanOrEqual(
          outer.left - 1,
        );
        expect(label.right).toBeLessThanOrEqual(outer.right + 1);
        expect(label.top).toBeGreaterThanOrEqual(outer.top - 1);
        const overlapping = moving.filter(
          (part) =>
            part !== undefined &&
            part.left < label.right - 1 &&
            part.right > label.left + 1 &&
            part.top < label.bottom - 1 &&
            part.bottom > label.top + 1,
        );
        expect(overlapping, `${viewId}/${id} clear of the moving parts`).toEqual([]);
      }
    }
  });
}

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Aircraft } from '@cpt/core';
import { expect, test } from '@playwright/test';
import { aircraftRegistry } from '../src/aircraft-registry';
import { copy, openPicker } from './trainer';

const viewports = [
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const MIN_TEXT_PX = Number(/--text-2xs:\s*(\d+)px/.exec(tokens)?.[1]);
if (!Number.isFinite(MIN_TEXT_PX)) throw new Error('tokens.css has no --text-2xs');

const source = (url: string) => readFileSync(fileURLToPath(url), 'utf8');

const viewBoxWidth = (svg: string) => Number(/viewBox="[\d.]+ [\d.]+ ([\d.]+)/.exec(svg)?.[1]);

// Text marked data-decor is dressing, not a control label.
const lettering = (svg: string) =>
  [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)]
    .filter(([, attributes]) => !attributes?.includes('data-decor'))
    .map(([, attributes, text]) => ({
      text: text ?? '',
      size: Number(/font-size="([\d.]+)"/.exec(attributes ?? '')?.[1]),
    }));

function tooSmall(svg: string, scale: number) {
  return lettering(svg)
    .filter(({ size }) => size * scale < MIN_TEXT_PX - 0.5)
    .map(({ text, size }) => `${text} ${(size * scale).toFixed(1)}px`);
}

const faces = (aircraft: Aircraft, viewId: string) =>
  Object.keys(aircraft.views[viewId]?.controls ?? {}).flatMap((id) => {
    const appearance = aircraft.controls[id]?.appearance;
    return appearance && 'artwork' in appearance ? [{ id, face: appearance.artwork.face }] : [];
  });

for (const aircraft of aircraftRegistry) {
  for (const viewport of viewports) {
    test(`${aircraft.id} prints control lettering at the minimum size at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const first = Object.values(aircraft.procedures).find(({ type }) => type === 'normal');
      if (!first) throw new Error(`${aircraft.id} has no normal procedure`);
      await openPicker(page);
      await page.getByRole('button', { name: aircraft.name.en }).click();
      await page.getByRole('button', { name: first.title.en }).click();
      await page.getByRole('radio', { name: copy.shell.guided }).check();
      await page.getByRole('button', { name: copy.shell.startProcedure, exact: true }).click();
      for (const [viewId, view] of Object.entries(aircraft.views)) {
        const tab = page.getByRole('tab', { name: view.name.en });
        await tab.click();
        await expect(tab).toHaveAttribute('aria-selected', 'true');
        const background = await page
          .locator('.panel-image')
          .evaluate((image) => image.getBoundingClientRect().width);
        const small: string[] = [];
        const backdrop = source(view.image);
        small.push(
          ...tooSmall(backdrop, background / viewBoxWidth(backdrop)).map(
            (label) => `${viewId}: ${label}`,
          ),
        );
        for (const { id, face } of faces(aircraft, viewId)) {
          const svg = source(face);
          const rendered = await page
            .locator(`[data-placement="${id}"] img`)
            .first()
            .evaluate((image) => image.getBoundingClientRect().width);
          small.push(
            ...tooSmall(svg, rendered / viewBoxWidth(svg)).map(
              (label) => `${viewId}/${id}: ${label}`,
            ),
          );
        }
        expect(small, `lettering below ${MIN_TEXT_PX - 0.5}px`).toEqual([]);
      }
    });
  }
}

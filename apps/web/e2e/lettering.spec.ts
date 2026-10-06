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

type Box = { left: number; top: number; right: number; bottom: number };

const GLYPH_WIDTH_EM = 0.75;

const legendBoxes = (svg: string): { text: string; box: Box }[] =>
  [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map(([, attributes = '', text = '']) => {
    const number = (name: string) =>
      Number(new RegExp(`\\b${name}="(-?[\\d.]+)"`).exec(attributes)?.[1]);
    const size = number('font-size');
    const width = text.length * GLYPH_WIDTH_EM * size;
    const anchor = /text-anchor="(\w+)"/.exec(attributes)?.[1];
    const x = number('x');
    const left = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
    const y = number('y');
    return {
      text,
      box: { left, right: left + width, top: y - size * 0.4, bottom: y + size * 0.4 },
    };
  });

const rectBoxes = (svg: string): Box[] =>
  [...svg.matchAll(/<rect\b([^>]*)\/>/g)].map(([, attributes = '']) => {
    const number = (name: string) =>
      Number(new RegExp(`\\b${name}="(-?[\\d.]+)"`).exec(attributes)?.[1]);
    return {
      left: number('x'),
      top: number('y'),
      right: number('x') + number('width'),
      bottom: number('y') + number('height'),
    };
  });

const overlaps = (a: Box, b: Box) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

// Boxes of the moving part at every position, swept along its travel.
function movingBoxes(aircraft: Aircraft, id: string): Box[] {
  const appearance = aircraft.controls[id]?.appearance;
  if (!appearance || !('artwork' in appearance)) return [];
  const { moving } = appearance.artwork;
  if (moving.type === 'positions') {
    return Object.values(moving.images).flatMap((url) => rectBoxes(source(url)));
  }
  if (moving.type !== 'travel') return [];
  const first = moving.path[0];
  const last = moving.path[moving.path.length - 1];
  if (!first || !last) return [];
  return rectBoxes(source(moving.image)).flatMap((box) => [
    box,
    {
      left: box.left + last.x - first.x,
      right: box.right + last.x - first.x,
      top: box.top + last.y - first.y,
      bottom: box.bottom + last.y - first.y,
    },
    {
      left: Math.min(box.left, box.left + last.x - first.x),
      right: Math.max(box.right, box.right + last.x - first.x),
      top: Math.min(box.top, box.top + last.y - first.y),
      bottom: Math.max(box.bottom, box.bottom + last.y - first.y),
    },
  ]);
}

for (const aircraft of aircraftRegistry) {
  test(`${aircraft.id} keeps face legends clear of the moving part at every position`, () => {
    const clashes = Object.keys(aircraft.controls).flatMap((id) => {
      const appearance = aircraft.controls[id]?.appearance;
      if (!appearance || !('artwork' in appearance)) return [];
      const moving = movingBoxes(aircraft, id);
      return legendBoxes(source(appearance.artwork.face))
        .filter(({ box }) =>
          moving.some((part) =>
            overlaps(
              { left: box.left - 2, right: box.right + 2, top: box.top, bottom: box.bottom },
              part,
            ),
          ),
        )
        .map(({ text }) => `${id}: ${text}`);
    });
    expect(clashes).toEqual([]);
  });

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
          const { width: rendered, height } = await page
            .locator(`[data-placement="${id}"] img`)
            .first()
            .evaluate((image) => {
              const { width, height } = image.getBoundingClientRect();
              return { width, height };
            });
          const [, , boxWidth, boxHeight] = /viewBox="([\d.\s]+)"/
            .exec(svg)?.[1]
            ?.split(/\s+/)
            .map(Number) ?? [0, 0, 0, 0];
          expect(
            rendered / (height * ((boxWidth ?? 1) / (boxHeight ?? 1))),
            `${viewId}/${id} face aspect`,
          ).toBeCloseTo(1, 1);
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

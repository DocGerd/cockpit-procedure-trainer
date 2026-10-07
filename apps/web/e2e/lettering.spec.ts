import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Aircraft } from '@cpt/core';
import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import { SWEEP_END } from '../../../packages/panel-kit/src/indicators/geometry';
import { aircraftRegistry } from '../src/aircraft-registry';
import { MIN_TEXT_PX, fitViewAt, letteringProblems, openAircraft, showView } from './legibility';

const viewports = [
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 3840, height: 2160 },
];

const source = (url: string) => readFileSync(fileURLToPath(url), 'utf8');

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
      await openAircraft(page, aircraft);
      for (const viewId of Object.keys(aircraft.views)) {
        const root = await showView(page, aircraft, viewId, 'en');
        expect(
          await letteringProblems(root, aircraft, viewId),
          `lettering below ${MIN_TEXT_PX - 0.5}px`,
        ).toEqual([]);
      }
    });
  }
}

const cardSizes = (svg: string) =>
  [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map(([, attributes = '', text = '']) => ({
    text,
    size: Number(/font-size="([\d.]+)"/.exec(attributes)?.[1]),
  }));

for (const aircraft of aircraftRegistry) {
  const compass = aircraft.indicators.compass?.appearance;
  if (!compass || !('artwork' in compass) || compass.artwork.moving.type !== 'needle') continue;
  const card = source(compass.artwork.moving.image);
  const cardWidth = Number(/viewBox="[\d.]+ [\d.]+ ([\d.]+)/.exec(card)?.[1]);
  const floor = aircraft.cockpit?.views.panel?.minWidth;

  const cardProblems = async (page: Page) => {
    const rendered = await page
      .locator('[data-view="panel"] [data-placement="compass"] img')
      .first()
      .evaluate((image) => image.getBoundingClientRect().width);
    return cardSizes(card)
      .filter(({ size }) => (size * rendered) / cardWidth < MIN_TEXT_PX - 0.5)
      .map(({ text, size }) => `${text} ${((size * rendered) / cardWidth).toFixed(1)}px`);
  };

  test(`${aircraft.id} prints every compass card glyph at the minimum size at the panel floor`, async ({
    page,
  }) => {
    if (floor === undefined) throw new Error(`${aircraft.id} declares no panel floor`);
    await openAircraft(page, aircraft);
    await showView(page, aircraft, 'panel', 'en');
    await fitViewAt(page, 'panel', floor);
    expect(await cardProblems(page), `compass card lettering below ${MIN_TEXT_PX - 0.5}px`).toEqual(
      [],
    );
  });

  test(`${aircraft.id} prints every compass card glyph at the minimum size at 1920x1080`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await openAircraft(page, aircraft);
    expect(await cardProblems(page), `compass card lettering below ${MIN_TEXT_PX - 0.5}px`).toEqual(
      [],
    );
  });
}

for (const aircraft of aircraftRegistry) {
  for (const viewport of viewports) {
    test(`${aircraft.id} keeps gauge captions clear of the needle at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openAircraft(page, aircraft);
      const crossings: string[] = [];
      for (const viewId of Object.keys(aircraft.views)) {
        const root = await showView(page, aircraft, viewId, 'en');
        crossings.push(
          ...(await root.locator('[data-widget="round-gauge"]').evaluateAll(
            (gauges, { where, sweepEnd }) =>
              gauges.flatMap((gauge) => {
                const label = gauge.querySelector('[data-label]');
                const needle = gauge.querySelector('[data-needle] line');
                if (!label || !needle) return [];
                const number = (element: Element, name: string) =>
                  Number(element.getAttribute(name));
                const length = number(needle, 'y1') - number(needle, 'y2');
                const tip = number(needle, 'y1') - length * Math.cos(sweepEnd);
                const top = number(label, 'y') - number(label, 'font-size') / 2;
                return top < tip + number(needle, 'stroke-width') / 2
                  ? [`${where}/${gauge.getAttribute('aria-label')}`]
                  : [];
              }),
            { where: viewId, sweepEnd: (SWEEP_END * Math.PI) / 180 },
          )),
        );
      }
      expect(crossings, 'gauge captions reaching the needle at the end of its sweep').toEqual([]);
    });
  }
}

const ARC_STEP = 0.25;

for (const aircraft of aircraftRegistry) {
  for (const viewport of viewports) {
    test(`${aircraft.id} keeps gauge captions clear of the arcs at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openAircraft(page, aircraft);
      const crowded: string[] = [];
      for (const viewId of Object.keys(aircraft.views)) {
        const root = await showView(page, aircraft, viewId, 'en');
        crowded.push(
          ...(await root.locator('[data-widget="round-gauge"]').evaluateAll(
            (gauges, { where, step }) =>
              gauges.flatMap((gauge) => {
                const label = gauge.querySelector<SVGTextElement>('[data-label]');
                if (!label) return [];
                const box = label.getBBox();
                const touches = [...gauge.querySelectorAll<SVGPathElement>('[data-arc]')].some(
                  (arc) => {
                    const reach = Number(arc.getAttribute('stroke-width')) / 2;
                    const length = arc.getTotalLength();
                    for (let at = 0; at <= length; at = at + step) {
                      const point = arc.getPointAtLength(at);
                      const dx = Math.max(box.x - point.x, 0, point.x - (box.x + box.width));
                      const dy = Math.max(box.y - point.y, 0, point.y - (box.y + box.height));
                      if (Math.hypot(dx, dy) < reach) return true;
                    }
                    return false;
                  },
                );
                return touches ? [`${where}/${gauge.getAttribute('aria-label')}`] : [];
              }),
            { where: viewId, step: ARC_STEP },
          )),
        );
      }
      expect(crowded, 'gauge captions touching a coloured arc').toEqual([]);
    });
  }
}

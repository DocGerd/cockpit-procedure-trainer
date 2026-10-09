import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Aircraft } from '@cpt/core';
import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import { aircraftRegistry } from '../src/aircraft-registry';
import {
  MIN_TEXT_PX,
  fitViewAt,
  indicatorLetteringProblems,
  letteringProblems,
  openAircraft,
  selectLanguage,
  showView,
} from './legibility';

const viewports = [
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 3840, height: 2160 },
];

// The priority viewports are covered by the viewport matrix in layout.spec.ts.
const extraViewport = { width: 1440, height: 900 };

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

// Every drawn shape of a sliding image, measured by the browser: its shadows and grain are
// paths too. Rotating images keep the rect sweep, as their axis-aligned boxes over-reach.
async function shapeBoxes(page: Page, svg: string): Promise<Box[]> {
  return page.evaluate((markup) => {
    const root = new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement;
    const host = document.body.appendChild(
      document.importNode(root, true),
    ) as unknown as SVGSVGElement;
    const toRoot = host.getScreenCTM()?.inverse();
    const shapes = host.querySelectorAll<SVGGraphicsElement>(
      'path, rect, circle, ellipse, line, polyline, polygon',
    );
    const boxes = [...shapes]
      .filter((shape) => !shape.closest('defs, pattern, mask, clipPath, symbol'))
      .flatMap((shape) => {
        const style = getComputedStyle(shape);
        const stroked = style.stroke !== 'none' ? Number.parseFloat(style.strokeWidth) || 0 : 0;
        if (style.fill === 'none' && stroked === 0) return [];
        const box = shape.getBBox();
        const toScreen = shape.getScreenCTM();
        if (!toScreen || !toRoot) return [];
        const corners = [
          [box.x, box.y],
          [box.x + box.width, box.y],
          [box.x, box.y + box.height],
          [box.x + box.width, box.y + box.height],
        ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(toScreen).matrixTransform(toRoot));
        const xs = corners.map(({ x }) => x);
        const ys = corners.map(({ y }) => y);
        const pad = stroked / 2;
        return [
          {
            left: Math.min(...xs) - pad,
            top: Math.min(...ys) - pad,
            right: Math.max(...xs) + pad,
            bottom: Math.max(...ys) + pad,
          },
        ];
      });
    host.remove();
    return boxes;
  }, svg);
}

const overlaps = (a: Box, b: Box) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

// Boxes of the moving part at every position, swept along its travel.
async function movingBoxes(page: Page, aircraft: Aircraft, id: string): Promise<Box[]> {
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
  return (await shapeBoxes(page, source(moving.image))).flatMap((box) => [
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
  test(`${aircraft.id} keeps face legends clear of the moving part at every position`, async ({
    page,
  }) => {
    const clashes: string[] = [];
    for (const id of Object.keys(aircraft.controls)) {
      const appearance = aircraft.controls[id]?.appearance;
      if (!appearance || !('artwork' in appearance)) continue;
      const moving = await movingBoxes(page, aircraft, id);
      const clashing = legendBoxes(source(appearance.artwork.face))
        .filter(({ box }) =>
          moving.some((part) =>
            overlaps(
              { left: box.left - 2, right: box.right + 2, top: box.top, bottom: box.bottom },
              part,
            ),
          ),
        )
        .map(({ text }) => `${id}: ${text}`);
      clashes.push(...clashing);
    }
    expect(clashes).toEqual([]);
  });

  test(`${aircraft.id} prints control lettering at the minimum size at ${extraViewport.width}x${extraViewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(extraViewport);
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

// From 1920x1080 up only (HD first): below it the small gauges render too small to letter at all.
const gaugeViewports = viewports.filter(({ width }) => width >= 1920);

for (const aircraft of aircraftRegistry) {
  for (const viewport of gaugeViewports) {
    test(`${aircraft.id} prints gauge face lettering at the minimum size at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openAircraft(page, aircraft);
      for (const viewId of Object.keys(aircraft.views)) {
        const root = await showView(page, aircraft, viewId, 'en');
        expect(
          await indicatorLetteringProblems(root, aircraft, viewId),
          `gauge lettering below ${MIN_TEXT_PX - 0.5}px`,
        ).toEqual([]);
      }
    });
  }
}

// The flap readout is dark without power, as in parking where the tests above open the CTSL,
// so its digits are checked lit, in cruise.
const ctsl = aircraftRegistry.find((aircraft) => aircraft.id === 'ctsl');
const readoutView = Object.entries(ctsl?.views ?? {}).find(([, view]) =>
  Object.hasOwn(view.indicators ?? {}, 'flapReadout'),
)?.[0];

// The widget leaves out units with too little room for them at the minimum size.
test('ctsl prints the lit flap readout digits at the minimum size at 1920x1080', async ({
  page,
}) => {
  if (!ctsl || readoutView === undefined) throw new Error('The CTSL places no flap readout');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openAircraft(page, ctsl, 'descent');
  const root = await showView(page, ctsl, readoutView, 'en');
  const readout = root.locator('[data-placement="flapReadout"] [data-widget="digital-readout"]');
  await expect(readout).toHaveAttribute('aria-label', /: -?\d+ °$/);
  await expect(readout.locator('[data-value]')).toHaveText(/^-?\d+$/);
  const sizes = await readout.evaluate((svg: SVGSVGElement) => {
    const { width, height } = svg.getBoundingClientRect();
    const box = svg.viewBox.baseVal;
    const scale = Math.min(width / box.width, height / box.height);
    return [...svg.querySelectorAll('[data-value], [data-units]')].map((text) => ({
      text: text.textContent ?? '',
      px: Number(text.getAttribute('font-size')) * scale,
    }));
  });
  expect(
    sizes.filter(({ px }) => px < MIN_TEXT_PX - 0.5).map(({ text, px }) => `${text} ${px}px`),
    `flap readout lettering below ${MIN_TEXT_PX - 0.5}px`,
  ).toEqual([]);
});

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
  test(`${aircraft.id} prints only fixed lettering in its indicators at 3840x2160`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 3840, height: 2160 });
    await openAircraft(page, aircraft);
    const printed: Record<'en' | 'de', Record<string, string>> = { en: {}, de: {} };
    const invented: string[] = [];
    for (const language of ['en', 'de'] as const) {
      await selectLanguage(page, language);
      for (const [viewId, view] of Object.entries(aircraft.views)) {
        const root = await showView(page, aircraft, viewId, language);
        for (const id of Object.keys(view.indicators ?? {})) {
          const placement = root.locator(`[data-placement="${id}"]`);
          const name = aircraft.indicators[id]?.name[language] ?? id;
          const text = await placement.evaluate((element) => ({
            text: element.textContent ?? '',
            captions: element.querySelectorAll('[data-label]').length,
          }));
          printed[language][`${viewId}/${id}`] = text.text;
          if (text.captions > 0 || text.text.toLowerCase().includes(name.toLowerCase())) {
            invented.push(`${language} ${viewId}/${id}: "${text.text}"`);
          }
        }
      }
    }
    expect(invented, 'indicators printing their accessible name').toEqual([]);
    expect(printed.de, 'indicator lettering that differs between languages').toEqual(printed.en);
  });
}

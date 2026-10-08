import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Browser, Page } from '@playwright/test';
import { paintMs } from './trace';
import type { TraceEvent } from './trace';

const CATEGORIES = ['devtools.timeline', 'disabled-by-default-devtools.timeline'];

export const SAMPLES = 9;
export const NEEDLE_FRAMES = 30;

export const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? Number.NaN;
};

/** Paint and raster milliseconds of the trace around `action`. */
export async function paintCost(
  browser: Browser,
  page: Page,
  action: () => Promise<void>,
): Promise<number> {
  await browser.startTracing(page, { categories: CATEGORIES });
  let buffer: Buffer;
  try {
    await action();
    await page.waitForTimeout(200);
  } finally {
    buffer = await browser.stopTracing();
  }
  const trace = JSON.parse(buffer.toString()) as {
    traceEvents?: TraceEvent[];
  };
  return paintMs(trace.traceEvents ?? []);
}

const nextPaint = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
  );

/**
 * What turns with a needle: artwork needle images (the stage's shadow mask holds one too) and a
 * panel-kit gauge's needle and its shadow.
 */
const NEEDLE_PARTS =
  ':is([data-moving="needle"] image, [data-widget] :is([data-needle], [data-needle-shadow]))';

/** Per-frame cost of turning every needle in the view, or undefined when it has none. */
export async function needleFrame(browser: Browser, page: Page, viewId: string) {
  const selector = `[data-view="${viewId}"] ${NEEDLE_PARTS}`;
  const needles = await page.evaluate((query) => document.querySelectorAll(query).length, selector);
  if (needles === 0) return undefined;
  const total = await paintCost(browser, page, () =>
    page.evaluate(
      async ({ query, frames }) => {
        const parts = [...document.querySelectorAll(query)].map((element) => {
          const transform = element.getAttribute('transform');
          const pivot = /rotate\(\s*\S+?[\s,]+(\S+?)[\s,]+(\S+?)\s*\)/.exec(transform ?? '');
          return { element, transform, x: pivot?.[1] ?? '0', y: pivot?.[2] ?? '0' };
        });
        try {
          for (let frame = 0; frame < frames; frame += 1) {
            for (const { element, x, y } of parts) {
              element.setAttribute('transform', `rotate(${-135 + 9 * frame} ${x} ${y})`);
            }
            await new Promise((done) => requestAnimationFrame(done));
          }
        } finally {
          for (const { element, transform } of parts) {
            if (transform === null) element.removeAttribute('transform');
            else element.setAttribute('transform', transform);
          }
        }
      },
      { query: selector, frames: NEEDLE_FRAMES },
    ),
  );
  return { needles, ms: total / NEEDLE_FRAMES };
}

/** Per-switch cost of a full re-raster of the view: a one-pixel resize and a hide-and-show. */
export async function reraster(browser: Browser, page: Page, viewId: string) {
  const size = page.viewportSize() ?? { width: 1024, height: 768 };
  // One pixel wider, not narrower: narrower crosses the shell header's min-width rule in
  // shell.css, so the sample would measure the header re-wrapping and the cockpit re-laying out.
  const resize = await paintCost(browser, page, async () => {
    await page.setViewportSize({ width: size.width + 1, height: size.height });
    await nextPaint(page);
    await page.setViewportSize(size);
    await nextPaint(page);
  });
  const toggle = await paintCost(browser, page, () =>
    page.evaluate(async (id) => {
      const view = document.querySelector<HTMLElement>(`[data-view="${id}"]`);
      if (!view) throw new Error(`No view "${id}" on the page`);
      const frame = () =>
        new Promise<void>((done) =>
          requestAnimationFrame(() => requestAnimationFrame(() => done())),
        );
      for (let round = 0; round < 2; round += 1) {
        view.style.visibility = 'hidden';
        await frame();
        view.style.visibility = '';
        await frame();
      }
    }, viewId),
  );
  return { resize: resize / 2, toggle: toggle / 2 };
}

export type ImageKind = 'background' | 'static' | 'needle' | 'positions' | 'travel';
export type ImageFilters = { url: string; kind: ImageKind; filters: number; turbulence: number };

// The build inlines small images; the page's CSP forbids fetching a data URL.
function decodeDataUrl(url: string): string | undefined {
  const match = /^data:[^,]*?(;base64)?,(.*)$/s.exec(url);
  if (!match) return undefined;
  const body = match[2] ?? '';
  return match[1] ? Buffer.from(body, 'base64').toString('utf8') : decodeURIComponent(body);
}

/** Every image the view draws, by role, with the filters its SVG uses; and `<filter>`s in the DOM. */
export async function filterCounts(page: Page, viewId: string) {
  const found = await page.evaluate((id) => {
    const root = document.querySelector(`[data-view="${id}"]`);
    if (!root) throw new Error(`No view "${id}" on the page`);
    const images = [...root.querySelectorAll('img[src], image[href]')].flatMap((element) => {
      if (element.closest('mask')) return [];
      const url = element.getAttribute('src') ?? element.getAttribute('href') ?? '';
      const moving = element.closest('[data-moving]')?.getAttribute('data-moving');
      const kind = element.classList.contains('panel-image') ? 'background' : (moving ?? 'static');
      return [{ url: new URL(url, document.baseURI).href, kind }];
    });
    return { images, domFilters: root.querySelectorAll('filter').length };
  }, viewId);
  const sources = new Map<string, string>();
  const images: ImageFilters[] = [];
  for (const { url, kind } of found.images) {
    if (!sources.has(url)) {
      sources.set(
        url,
        decodeDataUrl(url) ??
          (await page.evaluate(async (target) => (await fetch(target)).text(), url)),
      );
    }
    const svg = sources.get(url) ?? '';
    images.push({
      url,
      kind: kind as ImageKind,
      filters: (svg.match(/filter=["']url\(/g) ?? []).length,
      turbulence: (svg.match(/<feTurbulence\b/g) ?? []).length,
    });
  }
  return { images, domFilters: found.domFilters };
}

/** The P3 limits: at most one filter in a static or needle image, none in one that steps or slides. */
export function filterProblems(images: readonly ImageFilters[], domFilters: number): string[] {
  const limit: Record<ImageKind, number> = {
    background: Infinity,
    static: 1,
    needle: 1,
    positions: 0,
    travel: 0,
  };
  const problems = images.flatMap(({ url, kind, filters, turbulence }) => [
    ...(filters > limit[kind] ? [`${kind} image ${url} uses ${filters} filters`] : []),
    ...(kind !== 'background' && turbulence > 0 ? [`${url} uses feTurbulence`] : []),
    ...(kind === 'background' && turbulence > 1 ? [`${url} uses ${turbulence} feTurbulence`] : []),
  ]);
  return domFilters > 0 ? [...problems, `${domFilters} <filter> in the page DOM`] : problems;
}

const PACKAGES = resolve(import.meta.dirname, '../../../../packages');

function svgBytes(folder: string): number {
  return readdirSync(folder).reduce((sum, name) => {
    const path = join(folder, name);
    if (statSync(path).isDirectory()) return sum + svgBytes(path);
    return name.endsWith('.svg') ? sum + statSync(path).size : sum;
  }, 0);
}

/** Bytes of every SVG under the aircraft package's `src/assets/`. */
export const artworkBytes = (aircraftId: string): number =>
  svgBytes(join(PACKAGES, `aircraft-${aircraftId}`, 'src', 'assets'));

export const BASELINE_FILE = resolve(import.meta.dirname, 'baseline.json');

export const readBaseline = (): Record<string, number> =>
  JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as Record<string, number>;

/** Rendered CSS size of each artwork part's face in the view. */
export async function artworkSizes(page: Page, viewId: string) {
  return page.evaluate((id) => {
    const root = document.querySelector(`[data-view="${id}"]`);
    return [...(root?.querySelectorAll('.cpt-artwork-moving') ?? [])].map((overlay) => {
      const face = overlay.parentElement?.querySelector('img');
      const box = face?.getBoundingClientRect();
      return {
        placement: overlay.closest('[data-placement]')?.getAttribute('data-placement') ?? '?',
        width: Math.round(box?.width ?? 0),
        height: Math.round(box?.height ?? 0),
      };
    });
  }, viewId);
}

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Aircraft, Appearance } from '@cpt/core';
import type { Locator, Page } from '@playwright/test';
import { clearanceProblems } from './clearance';
import { DESKTOP_MIN_WIDTH } from '../src/shell/layout';
import { copy, openPicker, showView as showViewTab } from './trainer';

export type Language = 'en' | 'de';

const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
export const MIN_TEXT_PX = Number(/--text-2xs:\s*(\d+)px/.exec(tokens)?.[1]);
export const TOUCH_TARGET_PX = Number(/--size-target:\s*(\d+)px/.exec(tokens)?.[1]);
if (!Number.isFinite(MIN_TEXT_PX) || !Number.isFinite(TOUCH_TARGET_PX)) {
  throw new Error('tokens.css has no --text-2xs or --size-target');
}

// Sub-pixel rounding of rendered text and boxes.
const TOLERANCE_PX = 0.5;

/** Start a Guided procedure of the aircraft: the named one, else its first normal one. */
export async function openAircraft(page: Page, aircraft: Aircraft, procedureId?: string) {
  const first =
    procedureId === undefined
      ? Object.values(aircraft.procedures).find(({ type }) => type === 'normal')
      : aircraft.procedures[procedureId];
  if (!first) throw new Error(`${aircraft.id} has no procedure to start`);
  await openPicker(page);
  await page.getByRole('button', { name: aircraft.name.en }).click();
  await page.getByRole('button', { name: first.title.en }).click();
  await page.getByRole('radio', { name: copy.shell.guided }).check();
  await page.getByRole('button', { name: copy.shell.startProcedure, exact: true }).click();
}

export async function selectLanguage(page: Page, language: Language) {
  if (language === 'de') await page.getByRole('button', { name: copy.language.german }).click();
}

/** The view's own region when the page marks it, otherwise the tab panel. */
export async function viewRoot(page: Page, viewId: string): Promise<Locator> {
  const marked = page.locator(`[data-view="${viewId}"]`);
  return (await marked.count()) > 0 ? marked : page.getByRole('tabpanel');
}

/** Bring a view on screen, by tab only when there are tabs, and return the region that holds it. */
export async function showView(
  page: Page,
  aircraft: Aircraft,
  viewId: string,
  language: Language,
): Promise<Locator> {
  await showViewTab(page, aircraft.views[viewId]?.name[language] ?? viewId);
  return viewRoot(page, viewId);
}

const printsText = (lines: readonly string[] | undefined) =>
  lines?.some((line) => line.trim() !== '') ?? false;

const widgetPlacards = (aircraft: Aircraft, viewId: string) =>
  Object.entries(aircraft.views[viewId]?.controls ?? {}).flatMap(([id, placement]) => {
    const control = aircraft.controls[id];
    if (!control || !placement || printsText(placement.printed)) return [];
    if (control.appearance && 'artwork' in control.appearance) return [];
    return [{ id, text: (control.placard ?? control.name.en).toUpperCase() }];
  });

const MEASURABLE = 'rect, circle, ellipse, line, path, polygon, polyline';
const UNSUPPORTED = 'text, use, image, foreignObject';

/** Placard text, fit, placement, touch targets and clearance of the moving parts, per widget control. */
export async function placardProblems(
  root: Locator,
  aircraft: Aircraft,
  viewId: string,
): Promise<string[]> {
  const problems: string[] = [];
  for (const { id, text } of widgetPlacards(aircraft, viewId)) {
    const where = `${viewId}/${id}`;
    const geometry = await root.locator(`[data-placement="${id}"]`).evaluate(
      (element, { measurable, unsupported }) => {
        const box = (target: Element | null) => {
          const rect = target?.getBoundingClientRect();
          return rect && { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
        };
        const label = element.querySelector('[data-placard]');
        const labelBox = label?.getBoundingClientRect();
        const hit = labelBox
          ? document.elementFromPoint(
              (labelBox.left + labelBox.right) / 2,
              (labelBox.top + labelBox.bottom) / 2,
            )
          : null;
        return {
          text: label?.textContent?.trim() ?? null,
          placement: box(element),
          label: box(label),
          overfull: label?.hasAttribute('data-overfull') ?? false,
          underControl: Boolean(hit?.closest('button, [role="slider"], [role="radio"]')),
          ...(() => {
            const parts = [...element.querySelectorAll('.pk-move')]
              .flatMap((part) => [
                ...(part.matches(measurable) || part.matches(unsupported) ? [part] : []),
                ...part.querySelectorAll(`${measurable}, ${unsupported}`),
              ])
              .filter((part) => !part.closest('defs, clipPath, mask'));
            const drawn = parts
              .filter((part): part is SVGGraphicsElement => part.matches(measurable))
              .map((part) => ({ part, matrix: part.getScreenCTM() }));
            return {
              shapes: drawn.flatMap(({ part, matrix }) => {
                if (!matrix) return [];
                const { x, y, width, height } = part.getBBox();
                const { a, b, c, d, e, f } = matrix;
                return [
                  {
                    tag: part.tagName.toLowerCase(),
                    box: { x, y, width, height },
                    matrix: { a, b, c, d, e, f },
                  },
                ];
              }),
              unmeasurable: [
                ...parts.filter((part) => part.matches(unsupported)),
                ...drawn.filter(({ matrix }) => !matrix).map(({ part }) => part),
              ].map((part) => part.tagName.toLowerCase()),
            };
          })(),
          targets: [...element.querySelectorAll('button, [role="slider"]')].map((target) => {
            const { width, height } = target.getBoundingClientRect();
            return Math.min(width, height);
          }),
          fontPx: label ? Number.parseFloat(getComputedStyle(label).fontSize) : 0,
          scale: (() => {
            const svg = element.querySelector('svg');
            const width = svg?.viewBox.baseVal.width ?? 0;
            return width > 0 ? (svg?.getBoundingClientRect().width ?? 0) / width : 0;
          })(),
        };
      },
      { measurable: MEASURABLE, unsupported: UNSUPPORTED },
    );
    const { placement: outer, label, fontPx, scale } = geometry;
    if (geometry.text !== text) {
      problems.push(`${where} prints ${JSON.stringify(geometry.text)}, expected ${text}`);
    }
    if (!outer || !label) {
      problems.push(`${where} has no placard box`);
      continue;
    }
    if (geometry.overfull) problems.push(`${where} placard does not fit; shorten it`);
    if (fontPx * scale < MIN_TEXT_PX - TOLERANCE_PX) {
      problems.push(`${where} placard text ${(fontPx * scale).toFixed(1)}px`);
    }
    if (label.left < outer.left - 1 || label.right > outer.right + 1 || label.top < outer.top - 1) {
      problems.push(`${where} placard is not inside its placement`);
    }
    if (geometry.underControl) problems.push(`${where} placard sits under a touch target`);
    const small = geometry.targets.filter((size) => size < TOUCH_TARGET_PX - TOLERANCE_PX);
    if (small.length > 0) {
      problems.push(`${where} touch targets ${small.map((size) => size.toFixed(1)).join(', ')}px`);
    }
    problems.push(...clearanceProblems(where, label, geometry.shapes, geometry.unmeasurable));
  }
  return problems;
}

/** Every button of an installed device, at least the touch target in both directions. */
export async function deviceTargets(root: Locator): Promise<string[]> {
  const buttons = await root.locator('[data-kind="device"]').evaluateAll((devices) =>
    devices.flatMap((device) =>
      [...device.querySelectorAll('button')].map((button) => {
        const { width, height } = button.getBoundingClientRect();
        return {
          label: button.getAttribute('aria-label') ?? button.textContent?.trim() ?? '',
          size: Math.min(width, height),
        };
      }),
    ),
  );
  return buttons
    .filter(({ size }) => size < TOUCH_TARGET_PX - TOLERANCE_PX)
    .map(({ label, size }) => `device button ${label} ${size.toFixed(1)}px`);
}

/** Every operable target of a placed control, artwork included, at least the touch target. */
export async function controlTargets(root: Locator): Promise<string[]> {
  const targets = await root
    .locator('[data-kind="control"] :is(button, [role="slider"])')
    .evaluateAll((elements) =>
      elements.flatMap((element) => {
        const { width, height } = element.getBoundingClientRect();
        if (width === 0) return [];
        const placement = element.closest('[data-placement]')?.getAttribute('data-placement');
        return [{ placement: placement ?? '', size: Math.min(width, height) }];
      }),
    );
  return targets
    .filter(({ size }) => size < TOUCH_TARGET_PX - TOLERANCE_PX)
    .map(({ placement, size }) => `control ${placement} target ${size.toFixed(1)}px`);
}

/** The finding for overlapping targets of one placement (`a`) or of two (`a and b`, sorted). */
export const overlapProblem = (viewId: string, placements: string) =>
  `${viewId}: touch targets of ${placements} overlap`;

type Span = { from: number; to: number };

/** At least the touch target long, centred on the rendered span, and never shorter than it. */
const hitSpan = (from: number, to: number): Span => {
  const middle = (from + to) / 2;
  return {
    from: Math.min(from, middle - TOUCH_TARGET_PX / 2),
    to: Math.max(to, middle + TOUCH_TARGET_PX / 2),
  };
};

const shared = (a: Span, b: Span) => Math.min(a.to, b.to) - Math.max(a.from, b.from);

/**
 * Placements whose operable targets, position targets and device buttons alike, overlap: each
 * target covers its rendered box, grown to at least the touch target around its centre, since a
 * tap anywhere in it can land on the neighbour.
 */
export async function targetOverlaps(root: Locator, viewId: string): Promise<string[]> {
  const boxes = await root
    .locator(':is([data-kind="control"], [data-kind="device"]) :is(button, [role="slider"])')
    .evaluateAll((elements) =>
      elements.flatMap((element) => {
        const { left, right, top, bottom, width } = element.getBoundingClientRect();
        if (width === 0) return [];
        const placement = element.closest('[data-placement]')?.getAttribute('data-placement');
        return [{ placement: placement ?? '', left, right, top, bottom }];
      }),
    );
  const targets = boxes.map(({ placement, left, right, top, bottom }) => ({
    placement,
    x: hitSpan(left, right),
    y: hitSpan(top, bottom),
  }));
  const found = new Set<string>();
  targets.forEach((a, index) => {
    for (const b of targets.slice(index + 1)) {
      if (shared(a.x, b.x) <= TOLERANCE_PX || shared(a.y, b.y) <= TOLERANCE_PX) continue;
      const pair = [...new Set([a.placement, b.placement])].sort();
      found.add(overlapProblem(viewId, pair.join(' and ')));
    }
  });
  return [...found];
}

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
    .filter(({ size }) => size * scale < MIN_TEXT_PX - TOLERANCE_PX)
    .map(({ text, size }) => `${text} ${(size * scale).toFixed(1)}px`);
}

type FaceKind = 'controls' | 'indicators';

// Indicator faces: captions marked data-lettering="secondary" are exempt from the floor (ADR 0002, realism).
const withoutSecondary = (svg: string) =>
  svg.replace(/<text\b[^>]*data-lettering="secondary"[^>]*>[^<]*<\/text>/g, '');

const faces = (aircraft: Aircraft, viewId: string, kind: FaceKind) => {
  const definitions: Readonly<Record<string, { appearance?: Appearance } | undefined>> =
    kind === 'controls' ? aircraft.controls : aircraft.indicators;
  return Object.keys(aircraft.views[viewId]?.[kind] ?? {}).flatMap((id) => {
    const appearance = definitions[id]?.appearance;
    return appearance && 'artwork' in appearance ? [{ id, face: appearance.artwork.face }] : [];
  });
};

/** Lettering and aspect of each face of `kind` at the size the view renders it. */
async function faceProblems(
  root: Locator,
  aircraft: Aircraft,
  viewId: string,
  kind: FaceKind,
): Promise<string[]> {
  const problems: string[] = [];
  for (const { id, face } of faces(aircraft, viewId, kind)) {
    const svg = kind === 'indicators' ? withoutSecondary(source(face)) : source(face);
    const { width: rendered, height } = await root
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
    const aspect = rendered / (height * ((boxWidth ?? 1) / (boxHeight ?? 1)));
    if (Math.abs(aspect - 1) >= 0.05) problems.push(`${viewId}/${id} face aspect ${aspect}`);
    problems.push(
      ...tooSmall(svg, rendered / viewBoxWidth(svg)).map((label) => `${viewId}/${id}: ${label}`),
    );
  }
  return problems;
}

/** Backdrop and control face lettering at the size the view renders, and each face's aspect. */
export async function letteringProblems(
  root: Locator,
  aircraft: Aircraft,
  viewId: string,
): Promise<string[]> {
  const view = aircraft.views[viewId];
  if (!view) return [`${viewId} is not a view`];
  const background = await root
    .locator('.panel-image')
    .first()
    .evaluate((image) => image.getBoundingClientRect().width);
  const backdrop = source(view.image);
  return [
    ...tooSmall(backdrop, background / viewBoxWidth(backdrop)).map(
      (label) => `${viewId}: ${label}`,
    ),
    ...(await faceProblems(root, aircraft, viewId, 'controls')),
  ];
}

/** Indicator face lettering at the size the view renders, and each face's aspect. */
export const indicatorLetteringProblems = (root: Locator, aircraft: Aircraft, viewId: string) =>
  faceProblems(root, aircraft, viewId, 'indicators');

// Tall enough that the stage is bound by its width alone, never by the viewport height.
const TALL_VIEWPORT_PX = 4000;
const NARROWEST_VIEWPORT_PX = 320;

async function renderedWidth(root: Locator): Promise<number> {
  const read = () =>
    root
      .locator('.panel-image')
      .first()
      .evaluate(
        (image) =>
          new Promise<number>((resolve) => {
            requestAnimationFrame(() =>
              requestAnimationFrame(() => resolve(image.getBoundingClientRect().width)),
            );
          }),
      );
  let previous = await read();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const next = await read();
    if (next === previous) return next;
    previous = next;
  }
  return previous;
}

/**
 * Resize the viewport, in the layout that gives the view the whole page width, until the view's
 * image renders at `width` CSS px, within one px above it. Returns the width it renders at.
 */
export async function fitViewAt(page: Page, viewId: string, width: number): Promise<number> {
  const root = await viewRoot(page, viewId);
  const renderAt = async (viewport: number) => {
    await page.setViewportSize({ width: viewport, height: TALL_VIEWPORT_PX });
    return renderedWidth(root);
  };
  let low = NARROWEST_VIEWPORT_PX;
  let high = DESKTOP_MIN_WIDTH - 1;
  if ((await renderAt(high)) < width) {
    throw new Error(`${viewId} cannot render ${width}px wide below ${DESKTOP_MIN_WIDTH}px`);
  }
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if ((await renderAt(middle)) >= width) high = middle;
    else low = middle + 1;
  }
  return renderAt(low);
}

/** Every legibility finding for a view as it is rendered now. */
export async function legibilityProblems(
  page: Page,
  aircraft: Aircraft,
  viewId: string,
): Promise<string[]> {
  const root = await viewRoot(page, viewId);
  return [
    ...(await placardProblems(root, aircraft, viewId)),
    ...(await letteringProblems(root, aircraft, viewId)),
    ...(await deviceTargets(root)),
    ...(await controlTargets(root)),
    ...(await targetOverlaps(root, viewId)),
  ];
}

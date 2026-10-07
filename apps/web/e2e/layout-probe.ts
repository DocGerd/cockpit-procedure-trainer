import type { Aircraft } from '@cpt/core';
import type { Locator, Page } from '@playwright/test';
import { chooseLayout, outsideViewFold } from '../src/panel/cockpit-layout';
import type { OutsideStrip } from '../src/panel/cockpit-layout';

export type StripState = 'whole' | 'folded' | 'hidden';
export type LayoutKind = 'combined' | 'tabs';
export type CockpitState = { readonly layout: LayoutKind; readonly strip: StripState };

/**
 * The priority viewports (one-viewport design, "Viewport priority"): the 1080p and 4K desktops, a
 * real 1080p browser window (tab, address and bookmark bars and the taskbar take the rest), and a
 * tablet in each orientation.
 */
export const priorityViewports = [
  { name: '1080p screen', width: 1920, height: 1080 },
  { name: '1080p browser window', width: 1920, height: 950 },
  { name: '4K screen', width: 3840, height: 2160 },
  { name: 'tablet landscape', width: 1024, height: 768 },
  { name: 'tablet portrait', width: 768, height: 1024 },
] as const;

export type PriorityViewport = (typeof priorityViewports)[number];

/**
 * The state each aircraft must be in at each priority viewport, from the spec's rule (design spec,
 * Screen and Open question 1): the outside-view strip whole, else folded down to its minimum, else
 * hidden, and tabs only when even that leaves a view below its floor. An aircraft without a row
 * is checked against the derivation alone.
 */
export const expectedStates: Readonly<
  Record<string, Readonly<Record<PriorityViewport['name'], CockpitState>>>
> = {
  ctsl: {
    '1080p screen': { layout: 'combined', strip: 'whole' },
    '1080p browser window': { layout: 'combined', strip: 'hidden' },
    '4K screen': { layout: 'combined', strip: 'whole' },
    'tablet landscape': { layout: 'tabs', strip: 'whole' },
    'tablet portrait': { layout: 'tabs', strip: 'whole' },
  },
  demo: {
    '1080p screen': { layout: 'combined', strip: 'whole' },
    '1080p browser window': { layout: 'combined', strip: 'whole' },
    '4K screen': { layout: 'combined', strip: 'whole' },
    'tablet landscape': { layout: 'tabs', strip: 'whole' },
    'tablet portrait': { layout: 'tabs', strip: 'whole' },
  },
};

type Measure = {
  readonly width: number;
  readonly height: number;
  readonly strip: OutsideStrip;
  readonly chrome: { readonly width: number; readonly height: number };
};

/** The cockpit region as `useCockpitRegion` and `useCockpitLayout` read it, from the live page. */
const measureRegion = (page: Page): Promise<Measure> =>
  page.evaluate(() => {
    const pixels = (value: string | undefined) => Number.parseFloat(value ?? '') || 0;
    const query = <T extends Element>(selector: string) => {
      const found = document.querySelector<T>(selector);
      if (!found) throw new Error(`no ${selector}`);
      return found;
    };
    const root = query<HTMLElement>('.shell');
    const section = query<HTMLElement>('.shell-panel');
    const strip = query<HTMLElement>('.shell-outside-view');
    const frame = query<HTMLElement>('.panel-surface');
    const style = getComputedStyle(strip);
    const natural = Math.round(
      (strip.firstElementChild?.getBoundingClientRect().height ?? 0) +
        strip.offsetHeight -
        strip.clientHeight,
    );
    const folded = natural - strip.getBoundingClientRect().height - pixels(style.marginBottom);
    const top = section.getBoundingClientRect().top + window.scrollY + folded;
    const footer = root.querySelector('footer')?.getBoundingClientRect().height ?? 0;
    const body = root.querySelector('.shell-body');
    const padding = body ? pixels(getComputedStyle(body).paddingBottom) : 0;
    const box = getComputedStyle(frame);
    return {
      width: Math.floor(section.clientWidth),
      height: Math.floor(window.innerHeight - top - footer - padding),
      strip: {
        natural,
        min: pixels(style.getPropertyValue('--outside-view-band-min')),
        pull: pixels(style.getPropertyValue('--outside-view-pull')),
        gap: pixels(strip.parentElement ? getComputedStyle(strip.parentElement).rowGap : undefined),
      },
      chrome: {
        width:
          pixels(box.paddingLeft) +
          pixels(box.paddingRight) +
          pixels(box.borderLeftWidth) +
          pixels(box.borderRightWidth),
        height:
          pixels(box.paddingTop) +
          pixels(box.paddingBottom) +
          pixels(box.borderTopWidth) +
          pixels(box.borderBottomWidth),
      },
    };
  });

/** What the spec's rule gives for the room the page leaves the cockpit right now. */
export async function derivedState(page: Page, aircraft: Aircraft): Promise<CockpitState> {
  const { width, height, strip, chrome } = await measureRegion(page);
  const room = { width: width - chrome.width, height: height - chrome.height };
  const fold = outsideViewFold(aircraft, room, strip);
  const layout = chooseLayout(aircraft, { ...room, height: room.height + (fold?.gain ?? 0) });
  return { layout: layout.kind, strip: fold?.kind ?? 'whole' };
}

/** What the page shows right now. */
export async function renderedState(page: Page): Promise<CockpitState> {
  const shell = page.locator('.shell');
  const layout = await shell.getAttribute('data-cockpit-layout');
  const folded = await page.locator('.shell-outside-view').getAttribute('data-folded');
  return {
    layout: layout === 'combined' ? 'combined' : 'tabs',
    strip: folded === 'hidden' ? 'hidden' : folded === 'true' ? 'folded' : 'whole',
  };
}

const STATUS_TOKENS = ['--color-success', '--color-warning', '--color-danger'];

/**
 * Elements under `root` whose colour, fill, stroke, border or outline is a status colour of the
 * current theme. The panel is hardware: only the app's chrome speaks in status colours.
 */
export function statusColourProblems(root: Locator): Promise<string[]> {
  return root.evaluate((region, tokens) => {
    const probe = document.createElement('span');
    document.body.append(probe);
    const resolve = (token: string) => {
      probe.style.color = `var(${token})`;
      return getComputedStyle(probe).color;
    };
    const status = new Map(tokens.map((token) => [resolve(token), token]));
    probe.remove();
    const properties = [
      'color',
      'backgroundColor',
      'borderTopColor',
      'borderRightColor',
      'borderBottomColor',
      'borderLeftColor',
      'outlineColor',
      'fill',
      'stroke',
    ] as const;
    const found: string[] = [];
    for (const element of [region, ...region.querySelectorAll('*')]) {
      const style = getComputedStyle(element);
      for (const property of properties) {
        const token = status.get(style[property]);
        if (token) {
          const name = element.getAttribute('data-placement') ?? element.tagName.toLowerCase();
          found.push(`${name} ${property} is ${token}`);
        }
      }
    }
    return found;
  }, STATUS_TOKENS);
}

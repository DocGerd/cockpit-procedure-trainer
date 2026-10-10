import type { Page } from '@playwright/test';
import { demoAircraft } from '@cpt/aircraft-demo';
import { expect, test } from './fixtures';
import { openAircraft } from './legibility';
import { copy, openPicker } from './trainer';

type Probe = { selector: string; property: 'color' | 'backgroundColor' };
type Frame = Record<string, string>;

const key = ({ selector, property }: Probe) => `${selector} ${property}`;

const header: Probe[] = [
  { selector: '.shell-header .shell-brand-name', property: 'color' },
  { selector: '.shell-header', property: 'backgroundColor' },
];
const footer: Probe[] = [
  { selector: '.app-footer-version', property: 'color' },
  { selector: '.app-footer', property: 'backgroundColor' },
];
const trainer: Probe[] = [
  { selector: '.shell-checklist', property: 'backgroundColor' },
  { selector: '.shell-outside-view', property: 'backgroundColor' },
];

const channels = (value: string): number[] => {
  const numbers = (value.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  const scale = value.startsWith('color(') ? 255 : 1;
  return numbers.slice(0, 3).map((channel) => channel * scale);
};

/** Fraction of the way from `from` to `to`, projected over all three channels. */
const progress = (value: string, from: string, to: string): number => {
  const [a, b, c] = [channels(value), channels(from), channels(to)];
  const span = c.map((channel, i) => channel - (b[i] ?? 0));
  const length = span.reduce((sum, delta) => sum + delta * delta, 0);
  return span.reduce((sum, delta, i) => sum + delta * ((a[i] ?? 0) - (b[i] ?? 0)), 0) / length;
};

const spanOf = (from: string, to: string): number =>
  Math.max(...channels(to).map((channel, i) => Math.abs(channel - (channels(from)[i] ?? 0))));

const read = (page: Page, probes: Probe[]) =>
  page.evaluate((list) => {
    const out: Record<string, string> = {};
    for (const { selector, property } of list) {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`no ${selector}`);
      out[`${selector} ${property}`] = getComputedStyle(element)[property];
    }
    return out;
  }, probes);

/** Clicks the theme switch inside the page and samples every frame for `ms`. */
const toggleAndSample = (page: Page, probes: Probe[], label: string, ms: number) =>
  page.evaluate(
    ({ list, name, duration }) =>
      new Promise<Frame[]>((resolve) => {
        const frames: Record<string, string>[] = [];
        const started = performance.now();
        const sample = () => {
          const frame: Record<string, string> = {};
          for (const { selector, property } of list) {
            const element = document.querySelector(selector);
            frame[`${selector} ${property}`] = element ? getComputedStyle(element)[property] : '';
          }
          frames.push(frame);
          if (performance.now() - started < duration) requestAnimationFrame(sample);
          else resolve(frames);
        };
        document.querySelector<HTMLElement>(`button[aria-label="${name}"]`)?.click();
        requestAnimationFrame(sample);
      }),
    { list: probes, name: label, duration: ms },
  );

const FADE_WINDOW_MS = 800;

async function expectTogetherFade(page: Page, probes: Probe[]) {
  const before = await read(page, probes);
  const frames = await toggleAndSample(page, probes, copy.shell.switchToDark, FADE_WINDOW_MS);
  await expect(page.locator('html')).not.toHaveClass(/theme-fading/);
  const after = frames[frames.length - 1] as Frame;
  for (const probe of probes) {
    expect(after[key(probe)], `${key(probe)} changes with the theme`).not.toBe(before[key(probe)]);
  }
  const series = probes.map((probe) =>
    frames.map((frame) =>
      progress(frame[key(probe)] ?? '', before[key(probe)] ?? '', after[key(probe)] ?? ''),
    ),
  );
  const middle = frames.filter((_, i) =>
    series.every((s) => (s[i] ?? 0) > 0.1 && (s[i] ?? 0) < 0.9),
  );
  expect(middle.length, 'frames caught mid-transition').toBeGreaterThanOrEqual(3);
  console.log(JSON.stringify(series.map((s) => s.slice(0, 26).map((v) => +v.toFixed(2)))));
  const spans = probes.map((probe) => spanOf(before[key(probe)] ?? '', after[key(probe)] ?? ''));
  // Computed colours are whole 8-bit channels, so a short span resolves coarsely.
  const slack = (...indexes: number[]) =>
    0.03 + 2 / Math.min(...indexes.map((index) => spans[index] ?? 1));
  const reference = series[0] ?? [];
  series.forEach((other, j) => {
    if (j === 0) return;
    other.forEach((value, i) => {
      expect(Math.abs(value - (reference[i] ?? 0)), `progress apart at frame ${i}`).toBeLessThan(
        slack(0, j),
      );
    });
  });
  series.forEach((s, j) => {
    s.forEach((value, i) => {
      if (i > 0)
        expect(value, `progress at frame ${i}`).toBeGreaterThanOrEqual((s[i - 1] ?? 0) - slack(j));
    });
  });
}

test('the header text and background cross-fade together', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openPicker(page);
  await expectTogetherFade(page, header);
});

test('the footer and the picker frame cross-fade together', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openPicker(page);
  await expectTogetherFade(page, [...header, ...footer]);
});

test('the checklist pane and outside-view frame cross-fade with the header', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openAircraft(page, demoAircraft);
  await expectTogetherFade(page, [...header, ...trainer]);
});

test('reduced motion switches the theme instantly', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openPicker(page);
  const before = await read(page, [...header, ...footer]);
  const frames = await toggleAndSample(page, [...header, ...footer], copy.shell.switchToDark, 300);
  const settled = frames[frames.length - 1] as Frame;
  for (const [name, value] of Object.entries(settled)) expect(value).not.toBe(before[name]);
  const earliest = frames[1] ?? frames[0];
  expect(earliest).toEqual(settled);
});

test('a dark-mode load does not fade', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => {
    const seen: Record<string, string>[] = [];
    Object.assign(window, { __firstTheme: seen });
    new MutationObserver(() => {
      const root = document.documentElement;
      const bar = document.querySelector('.shell-header');
      if (root.dataset.theme && bar && seen.length === 0) {
        seen.push({
          background: getComputedStyle(bar).backgroundColor,
          fading: String(root.classList.contains('theme-fading')),
        });
      }
    }).observe(document, { attributes: true, subtree: true, childList: true });
  });
  await openPicker(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.waitForTimeout(600);
  const settled = await read(page, header);
  const first = await page.evaluate(
    () => (window as unknown as { __firstTheme: Record<string, string>[] }).__firstTheme[0],
  );
  expect(first?.fading).toBe('false');
  expect(first?.background).toBe(settled['.shell-header backgroundColor']);
  await expect(page.locator('html')).not.toHaveClass(/theme-fading/);
});

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 3840, height: 2160 },
]) {
  test(`header and footer keep their height through a theme change at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openPicker(page);
    const heights = () =>
      page.evaluate(() => ({
        header: document.querySelector('.shell-header')?.getBoundingClientRect().height,
        footer: document.querySelector('.app-footer')?.getBoundingClientRect().height,
      }));
    const before = await heights();
    const frames = await toggleAndSample(page, header, copy.shell.switchToDark, 500);
    expect(frames.length).toBeGreaterThan(5);
    expect(await heights()).toEqual(before);
    await page.waitForTimeout(300);
    expect(await heights()).toEqual(before);
    await page.getByRole('button', { name: copy.shell.switchToLight }).click();
    await page.waitForTimeout(500);
    expect(await heights()).toEqual(before);
  });
}

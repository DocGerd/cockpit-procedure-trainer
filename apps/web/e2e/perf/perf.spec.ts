import { writeFileSync } from 'node:fs';
import type { Aircraft } from '@cpt/core';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { aircraftRegistry } from '../../src/aircraft-registry';
import { openAircraft, showView } from '../legibility';
import {
  artworkBytes,
  artworkSizes,
  BASELINE_FILE,
  filterCounts,
  filterProblems,
  median,
  needleFrame,
  readBaseline,
  reraster,
  SAMPLES,
} from './measure';
import { range } from './trace';

/** The plan's performance budget (M12, P1 to P4). */
const BUDGET = { needleFrameMs: 4, rerasterMs: 33, payloadFactor: 3 };

/**
 * One arm of the sound A/B (sounds spec §10): `on` or `off` measures each aircraft that declares
 * sounds from a cruise start, so its voices run; unset, the run measures as before.
 */
const SOUND = process.env.E2E_SOUND;
if (SOUND !== undefined && SOUND !== 'on' && SOUND !== 'off') {
  throw new Error(`E2E_SOUND is on or off, not ${SOUND}`);
}

const ARM = SOUND === undefined ? '' : `, sound ${SOUND}`;

test.use({ seedSoundOff: SOUND !== 'on' });

const measured =
  SOUND === undefined
    ? aircraftRegistry
    : aircraftRegistry.filter((aircraft) => Object.keys(aircraft.sounds ?? {}).length > 0);

const cruiseStart = (aircraft: Aircraft) => {
  const found = Object.entries(aircraft.procedures).find(
    ([, { type, startPhase }]) => type === 'normal' && startPhase === 'cruise',
  );
  if (!found) throw new Error(`${aircraft.id} has no normal procedure that starts in cruise`);
  return found[0];
};

type AudioLog = { __audioContexts: AudioContext[] };

// The engine builds its context with `new AudioContext()`, so a subclass sees each one it makes.
const wrapAudioContext = (page: Page) =>
  page.addInitScript(() => {
    const built: AudioContext[] = [];
    Object.assign(window, { __audioContexts: built });
    window.AudioContext = class extends window.AudioContext {
      constructor(options?: AudioContextOptions) {
        super(options);
        built.push(this);
      }
    };
  });

const contextStates = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as AudioLog).__audioContexts.map((context) => context.state),
  );

const ms = (value: number | undefined) => (value === undefined ? 'n/a' : value.toFixed(2));
const spread = (values: readonly number[]) => {
  const { min, max } = range(values);
  return `${ms(median(values))} (${ms(min)}-${ms(max)})`;
};

for (const aircraft of measured) {
  test(`${aircraft.id} keeps needle frames, re-raster and filters in budget (P1-P3)`, async ({
    browser,
    context,
    page,
  }) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    if (SOUND === undefined) {
      await openAircraft(page, aircraft);
    } else {
      await wrapAudioContext(page);
      // The picker's clicks are the gesture that starts the context.
      await openAircraft(page, aircraft, cruiseStart(aircraft));
      if (SOUND === 'on') await expect.poll(() => contextStates(page)).toEqual(['running']);
      else expect(await contextStates(page)).toEqual([]);
    }
    const rows: string[] = [];
    let measuredNeedles = 0;
    for (const [viewId, view] of Object.entries(aircraft.views)) {
      await showView(page, aircraft, viewId, 'en');
      await page.waitForFunction(
        (id) =>
          [...document.querySelectorAll<HTMLImageElement>(`[data-view="${id}"] img`)].every(
            (image) => image.complete,
          ),
        viewId,
      );
      const broken = await page.evaluate(
        (id) =>
          [...document.querySelectorAll<HTMLImageElement>(`[data-view="${id}"] img`)]
            .filter((image) => image.naturalWidth === 0)
            .map((image) => image.src),
        viewId,
      );
      expect(broken, `${viewId}: images that failed to load`).toEqual([]);
      await page.waitForTimeout(1000);

      const needles: number[] = [];
      const resizes: number[] = [];
      const toggles: number[] = [];
      let needleCount = 0;
      for (let sample = 0; sample < SAMPLES; sample += 1) {
        const frame = await needleFrame(browser, page, viewId);
        if (frame) {
          needles.push(frame.ms);
          needleCount = frame.needles;
        }
        const { resize, toggle } = await reraster(browser, page, viewId);
        resizes.push(resize);
        toggles.push(toggle);
      }
      const needle = needles.length > 0 ? median(needles) : undefined;
      const show = median(toggles);
      const { images, domFilters } = await filterCounts(page, viewId);
      const filters = filterProblems(images, domFilters);
      const used = images.reduce((sum, { filters: count }) => sum + count, 0);

      rows.push(
        [
          view.name.en.padEnd(16),
          `P1 ${needles.length > 0 ? spread(needles) : 'n/a'} ms/frame (${needleCount} parts)`.padEnd(
            44,
          ),
          `P2 show ${spread(toggles)} ms, resize ${spread(resizes)} ms (information)`.padEnd(62),
          `P3 ${used} filter uses in ${images.length} images${filters.length ? ' FAIL' : ''}`,
        ].join(' | '),
      );
      if (needle !== undefined) {
        measuredNeedles += 1;
        expect
          .soft(needle, `${viewId}: P1 needle frame ms`)
          .toBeLessThanOrEqual(BUDGET.needleFrameMs);
      }
      expect.soft(show, `${viewId}: P2 show ms`).toBeLessThanOrEqual(BUDGET.rerasterMs);
      expect.soft(filters, `${viewId}: P3 filters`).toEqual([]);
    }
    console.log(
      [`${aircraft.id}${ARM}, 1024x768, CPU 4x, median (min-max) of ${SAMPLES}:`, ...rows].join(
        '\n  ',
      ),
    );
    expect(measuredNeedles, 'views with a needle to measure (P1)').toBeGreaterThan(0);
  });

  test(`${aircraft.id} prints each artwork part's rendered size at 1920x1080`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await openAircraft(page, aircraft);
    const rows: string[] = [];
    for (const viewId of Object.keys(aircraft.views)) {
      await showView(page, aircraft, viewId, 'en');
      await page.waitForTimeout(500);
      for (const { placement, width, height } of await artworkSizes(page, viewId)) {
        rows.push(`${viewId.padEnd(10)} ${placement.padEnd(24)} ${width}x${height}`);
      }
    }
    console.log([`${aircraft.id} artwork parts at 1920x1080, CSS px:`, ...rows].join('\n  '));
  });
}

test('every aircraft keeps its artwork payload in budget (P4)', () => {
  const bytes = Object.fromEntries(
    aircraftRegistry.map((aircraft) => [aircraft.id, artworkBytes(aircraft.id)]),
  );
  if (process.env.PERF_RECORD === '1') {
    writeFileSync(BASELINE_FILE, `${JSON.stringify(bytes, null, 2)}\n`);
  }
  const baseline = readBaseline();
  const rows = Object.entries(bytes).map(([id, size]) => {
    const base = baseline[id];
    return `${id.padEnd(8)} ${size} bytes, baseline ${base ?? 'none'}${base === undefined ? '' : `, ${(size / base).toFixed(2)}x`}`;
  });
  console.log(['P4 artwork SVG payload:', ...rows].join('\n  '));
  for (const [id, size] of Object.entries(bytes)) {
    const base = baseline[id];
    expect(base, `${id}: no P4 baseline; record one with PERF_RECORD=1`).toBeDefined();
    expect
      .soft(size, `${id}: P4 payload bytes`)
      .toBeLessThanOrEqual((base ?? 0) * BUDGET.payloadFactor);
  }
});

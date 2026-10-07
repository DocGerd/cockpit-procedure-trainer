import { writeFileSync } from 'node:fs';
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

/** The plan's performance budget (M12, P1 to P4). */
const BUDGET = { needleFrameMs: 4, rerasterMs: 33, payloadFactor: 3 };

const ms = (value: number | undefined) => (value === undefined ? 'n/a' : value.toFixed(2));

for (const aircraft of aircraftRegistry) {
  test(`${aircraft.id} keeps needle frames, re-raster and filters in budget (P1-P3)`, async ({
    browser,
    context,
    page,
  }) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await openAircraft(page, aircraft);
    const rows: string[] = [];
    for (const [viewId, view] of Object.entries(aircraft.views)) {
      await showView(page, aircraft, viewId, 'en');
      await page.waitForFunction(
        (id) =>
          [...document.querySelectorAll<HTMLImageElement>(`[data-view="${id}"] img`)].every(
            (image) => image.complete,
          ),
        viewId,
      );
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
      const full = Math.max(median(resizes), median(toggles));
      const { images, domFilters } = await filterCounts(page, viewId);
      const filters = filterProblems(images, domFilters);
      const used = images.reduce((sum, { filters: count }) => sum + count, 0);

      rows.push(
        [
          view.name.en.padEnd(16),
          `P1 ${ms(needle)} ms/frame (${needleCount} parts)`.padEnd(34),
          `P2 ${ms(full)} ms (resize ${ms(median(resizes))}, show ${ms(median(toggles))})`.padEnd(
            48,
          ),
          `P3 ${used} filter uses in ${images.length} images${filters.length ? ' FAIL' : ''}`,
        ].join(' | '),
      );
      if (needle !== undefined) {
        expect
          .soft(needle, `${viewId}: P1 needle frame ms`)
          .toBeLessThanOrEqual(BUDGET.needleFrameMs);
      }
      expect.soft(full, `${viewId}: P2 re-raster ms`).toBeLessThanOrEqual(BUDGET.rerasterMs);
      expect.soft(filters, `${viewId}: P3 filters`).toEqual([]);
    }
    console.log([`${aircraft.id}, 1024x768, CPU 4x, median of ${SAMPLES}:`, ...rows].join('\n  '));
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
    return `${id.padEnd(8)} ${size} bytes, baseline ${base ?? 'none'}${base ? `, ${(size / base).toFixed(2)}x` : ''}`;
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

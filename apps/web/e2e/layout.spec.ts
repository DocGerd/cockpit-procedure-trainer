import { expect, test } from './fixtures';
import type { Aircraft } from '@cpt/core';
import type { Locator, Page } from '@playwright/test';
import { aircraftRegistry } from '../src/aircraft-registry';
import { openPicker } from './trainer';
import {
  TOUCH_TARGET_PX,
  deviceTargets,
  indicatorLetteringProblems,
  letteringProblems,
  openAircraft,
  showView,
  viewRoot,
} from './legibility';
import {
  derivedState,
  expectedStates,
  priorityViewports,
  renderedState,
  statusColourProblems,
} from './layout-probe';

type Viewport = { readonly width: number; readonly height: number };

const themes = ['light', 'dark'] as const;
const TOLERANCE_PX = 0.5;

// Where the indicator faces print below the minimum, by aircraft and priority viewport. Marked
// `test.fail`, so the row fails once the art is fixed and the entry has to go.
const indicatorFaceGaps: Readonly<
  Record<string, readonly (typeof priorityViewports)[number]['name'][]>
> = {
  ctsl: ['tablet landscape', 'tablet portrait'],
};

const desktops = [
  { width: 1920, height: 1080 },
  { width: 3840, height: 2160 },
];

// Below every aircraft's breakpoint, even with the outside-view strip hidden: the tabs.
const shortDesktop = { width: 1920, height: 800 };

const cockpitLayout = (page: Page) => page.locator('.shell');
const outsideView = (page: Page) => page.locator('.shell-outside-view');
const dockRegion = (page: Page) => page.getByRole('region', { name: 'Device dock' });

const boxOf = async (locator: Locator) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error('no box');
  return box;
};

async function expectNoPageScroll(page: Page) {
  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - window.innerWidth,
    y: document.documentElement.scrollHeight - window.innerHeight,
  }));
  expect(overflow, 'page scroll').toEqual({ x: 0, y: 0 });
  await expect(page.getByRole('contentinfo')).toBeInViewport({ ratio: 1 });
}

async function expectFooterClear(page: Page) {
  const footer = page.getByRole('contentinfo');
  await expect(footer).toBeInViewport({ ratio: 1 });
  const top = (await footer.boundingBox())?.y ?? 0;
  const covered = await page
    .locator('main button, main [role="radio"], main [role="slider"], header button')
    .evaluateAll(
      (controls, footerTop) =>
        controls.filter((control) => control.getBoundingClientRect().bottom > footerTop).length,
      top,
    );
  expect(covered, 'controls reaching into the footer').toBe(0);
}

async function expectCellsAtTheirFloors(page: Page, aircraft: Aircraft, viewport: Viewport) {
  for (const [viewId, cell] of Object.entries(aircraft.cockpit?.views ?? {})) {
    const region = page.locator(`[data-view="${viewId}"]`);
    const box = await boxOf(region);
    expect(box.x, `${viewId} left`).toBeGreaterThanOrEqual(0);
    expect(box.y, `${viewId} top`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${viewId} right`).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height, `${viewId} bottom`).toBeLessThanOrEqual(viewport.height);
    const image = await region
      .locator('.panel-image')
      .first()
      .evaluate((element) => element.getBoundingClientRect().width);
    expect(image, `${viewId} rendered width`).toBeGreaterThanOrEqual(cell.minWidth);
  }
  const dock = aircraft.cockpit?.dock;
  if (dock) {
    const box = await boxOf(dockRegion(page));
    expect(box.x + box.width, 'dock right').toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height, 'dock bottom').toBeLessThanOrEqual(viewport.height);
    expect(box.width, 'dock width').toBeGreaterThanOrEqual(dock.minWidth);
    const panel = await boxOf(page.locator('[data-view="panel"]'));
    expect(box.y, 'dock under the panel').toBeGreaterThanOrEqual(panel.y + panel.height);
    // Under the panel means a docked device opens below the slots it mirrors.
    const slots = await page.locator('[data-view="panel"] [data-slot-mirror]').all();
    const underSlot = await Promise.all(
      slots.map(async (slot) => {
        const { x, width } = await boxOf(slot);
        const overlap = Math.min(box.x + box.width, x + width) - Math.max(box.x, x);
        return overlap >= width / 3;
      }),
    );
    expect(underSlot, 'dock reaches under a device slot').toContain(true);
    if (aircraft.cockpit?.views.centre) {
      const centre = await boxOf(page.locator('[data-view="centre"]'));
      expect(centre.y, 'centre field under the panel').toBeGreaterThanOrEqual(
        panel.y + panel.height,
      );
      const middle = centre.x + centre.width / 2;
      expect(middle, 'centre field under the middle of the panel').toBeGreaterThan(
        panel.x + panel.width / 3,
      );
      expect(middle, 'centre field under the middle of the panel').toBeLessThan(
        panel.x + (2 * panel.width) / 3,
      );
      expect(
        box.x + box.width <= centre.x || box.x >= centre.x + centre.width,
        'dock clear of the centre column',
      ).toBe(true);
      if (aircraft.cockpit?.views.console) {
        const consoleBox = await boxOf(page.locator('[data-view="console"]'));
        expect(
          consoleBox.y >= centre.y + centre.height ||
            (consoleBox.y >= panel.y + panel.height && consoleBox.x >= centre.x + centre.width),
          'console below or beside the centre field',
        ).toBe(true);
        if (aircraft.cockpit?.views.bulkhead) {
          const bulkhead = await boxOf(page.locator('[data-view="bulkhead"]'));
          expect(bulkhead.y, 'bulkhead behind the console').toBeGreaterThanOrEqual(
            consoleBox.y + consoleBox.height,
          );
        }
      }
    }
  }
}

const expectTarget = (box: { width: number; height: number }, what: string) =>
  expect(Math.min(box.width, box.height), what).toBeGreaterThanOrEqual(
    TOUCH_TARGET_PX - TOLERANCE_PX,
  );

/** Dock every device of the aircraft in turn, closing it again, and check what the dock holds. */
async function expectEveryDeviceDocks(
  page: Page,
  aircraft: Aircraft,
  combined: boolean,
): Promise<void> {
  const empty = await boxOf(dockRegion(page));
  for (const [installId, install] of Object.entries(aircraft.devices ?? {})) {
    await showView(page, aircraft, install.view, 'en');
    await page.locator(`[data-placement="${installId}"]`).getByRole('button').click();
    const dock = dockRegion(page);
    await expect(dock).toHaveAttribute('data-dock', 'held');
    const unit = dock.getByRole('group', { name: install.device, exact: true });
    await expect(unit).toBeVisible();

    const buttons = await unit.getByRole('button').all();
    expect(buttons.length, `${installId} keys`).toBeGreaterThan(0);
    for (const button of buttons) {
      expectTarget(
        await boxOf(button),
        `${installId} ${(await button.getAttribute('aria-label')) ?? 'key'}`,
      );
    }
    if (combined) {
      const [held, shown] = [await boxOf(dock), await boxOf(unit)];
      expect(held, 'dock box with the device in it').toEqual(empty);
      expect(shown.x, `${installId} left`).toBeGreaterThanOrEqual(held.x);
      expect(shown.y, `${installId} top`).toBeGreaterThanOrEqual(held.y);
      expect(shown.x + shown.width, `${installId} right`).toBeLessThanOrEqual(
        held.x + held.width + TOLERANCE_PX,
      );
      expect(shown.y + shown.height, `${installId} bottom`).toBeLessThanOrEqual(
        held.y + held.height + TOLERANCE_PX,
      );
      await expectNoPageScroll(page);
    }

    const close = dock.getByRole('button', { name: 'Close device' });
    expectTarget(await boxOf(close), `${installId} close button`);
    await close.click();
    await expect(dock).toHaveAttribute('data-dock', 'empty');
  }
}

async function inEachTheme(page: Page, check: () => Promise<void>) {
  for (const theme of themes) {
    await page.emulateMedia({ colorScheme: theme });
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await check();
  }
  await page.emulateMedia({ colorScheme: 'light' });
}

// One page per aircraft and viewport. Each row proves, in order: the layout and outside-strip state
// the rule gives (and the table in layout-probe.ts lists), the floors, the page fit with the dock
// empty and with each device in it, the 44 px targets, the status colours and the printed labels.
for (const aircraft of aircraftRegistry) {
  for (const viewport of priorityViewports) {
    test(`${aircraft.id} meets the cockpit rules at ${viewport.name} ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openAircraft(page, aircraft);
      const viewIds = Object.keys(aircraft.views);

      await expect
        .poll(async () => {
          const rendered = JSON.stringify(await renderedState(page));
          const rule = JSON.stringify(await derivedState(page, aircraft));
          return rendered === rule ? 'agree' : `rendered ${rendered}, rule ${rule}`;
        })
        .toBe('agree');
      const state = await renderedState(page);
      const listed = expectedStates[aircraft.id]?.[viewport.name];
      if (listed) expect(state, 'against the spec table').toEqual(listed);
      if (state.strip === 'hidden') await expect(outsideView(page)).toBeHidden();
      else await expect(outsideView(page)).toBeVisible();
      const combined = state.layout === 'combined';

      await expect(cockpitLayout(page)).toHaveAttribute('data-cockpit-layout', state.layout);
      await expect(dockRegion(page)).toBeVisible();
      if (combined) {
        await expect(page.getByRole('tablist')).toHaveCount(0);
        await expectCellsAtTheirFloors(page, aircraft, viewport);
        await expectFooterClear(page);
      } else {
        await expect(page.getByRole('tablist')).toBeVisible();
        await expect(page.getByRole('tab')).toHaveCount(viewIds.length);
      }
      await inEachTheme(page, () => expectNoPageScroll(page));

      await expectEveryDeviceDocks(page, aircraft, combined);

      const withDevices = new Set(
        Object.values(aircraft.devices ?? {}).map((install) => install.view),
      );
      for (const viewId of viewIds) {
        await showView(page, aircraft, viewId, 'en');
        const root = await viewRoot(page, viewId);
        if (withDevices.has(viewId)) expect(await deviceTargets(root), viewId).toEqual([]);
        await inEachTheme(page, async () => {
          expect(await statusColourProblems(root), `${viewId} status colours`).toEqual([]);
        });
        expect(await letteringProblems(root, aircraft, viewId), viewId).toEqual([]);
      }
    });

    // The indicator faces: its own test so a finding does not hide the rest of the row.
    test(`${aircraft.id} prints indicator face lettering at the minimum size at ${viewport.name} ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      test.fail(
        indicatorFaceGaps[aircraft.id]?.includes(viewport.name) ?? false,
        'Gauges render too small at tablet sizes for face lettering at the minimum (#420)',
      );
      await page.setViewportSize(viewport);
      await openAircraft(page, aircraft);
      const problems: string[] = [];
      for (const viewId of Object.keys(aircraft.views)) {
        const root = await showView(page, aircraft, viewId, 'en');
        problems.push(...(await indicatorLetteringProblems(root, aircraft, viewId)));
      }
      expect(problems).toEqual([]);
    });
  }

  test(`${aircraft.id} does not scroll the page at ${shortDesktop.width}x${shortDesktop.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(shortDesktop);
    await openAircraft(page, aircraft);
    await expect(cockpitLayout(page)).toHaveAttribute('data-cockpit-layout', 'tabs');
    await expectNoPageScroll(page);
  });
}

test('the status colour probe sees a status colour on a panel element', async ({ page }) => {
  const [aircraft] = aircraftRegistry;
  if (!aircraft) throw new Error('The aircraft registry is empty');
  await openAircraft(page, aircraft);
  const [viewId] = Object.keys(aircraft.views);
  if (!viewId) throw new Error(`${aircraft.id} has no views`);
  const root = await showView(page, aircraft, viewId, 'en');
  await inEachTheme(page, async () => {
    for (const token of ['--color-success', '--color-warning', '--color-danger']) {
      await root.evaluate((region, name) => {
        const tinted = document.createElement('div');
        tinted.dataset.placement = 'negative-control';
        tinted.style.color = `var(${name})`;
        region.append(tinted);
      }, token);
      expect(await statusColourProblems(root), token).toContain(
        'negative-control color is ' + token,
      );
      await root.evaluate((region) =>
        region.querySelector('[data-placement="negative-control"]')?.remove(),
      );
    }
  });
});

const ctsl = aircraftRegistry.find((entry) => entry.id === 'ctsl');
if (!ctsl) throw new Error('The aircraft registry has no CTSL');

// Where the outside-view strip gives up room, by aircraft, in a 1920 wide window.
const strips = [
  { aircraft: 'ctsl', height: 1080, folded: 'false' },
  { aircraft: 'ctsl', height: 1000, folded: 'true' },
  { aircraft: 'ctsl', height: 950, folded: 'hidden' },
  { aircraft: 'demo', height: 1080, folded: 'false' },
  { aircraft: 'demo', height: 920, folded: 'true' },
  { aircraft: 'demo', height: 860, folded: 'hidden' },
];

for (const { aircraft: id, height, folded } of strips) {
  test(`the ${id} outside-view strip is ${folded === 'false' ? 'whole' : folded === 'true' ? 'folded' : 'hidden'} at 1920x${height}`, async ({
    page,
  }) => {
    const aircraft = aircraftRegistry.find((entry) => entry.id === id);
    if (!aircraft) throw new Error(`The aircraft registry has no ${id}`);
    await page.setViewportSize({ width: 1920, height });
    await openAircraft(page, aircraft);
    await expect(cockpitLayout(page)).toHaveAttribute('data-cockpit-layout', 'combined');
    await expect(outsideView(page)).toHaveAttribute('data-folded', folded);
    expect(await derivedState(page, aircraft), 'the rule agrees').toEqual(
      await renderedState(page),
    );
    const box = await outsideView(page).boundingBox();
    if (folded === 'true') expect(box?.height).toBeGreaterThanOrEqual(72);
    if (folded === 'hidden') {
      await expect(outsideView(page)).toBeHidden();
      await expect(page.locator('.shell-panel')).toBeInViewport();
    }
    await expectNoPageScroll(page);
  });
}

// #226: holding the key on START while watching the tachometer.
for (const viewport of desktops) {
  test(`the CTSL starts while the key is held on START with the tachometer in sight at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openAircraft(page, ctsl, 'engineStart');
    await expect(cockpitLayout(page)).toHaveAttribute('data-cockpit-layout', 'combined');

    const nameOf = (id: string) => {
      const name = ctsl.controls[id]?.name.en;
      if (!name) throw new Error(`The CTSL has no control ${id}`);
      return name;
    };
    for (const id of ['battery', 'fuelValve', 'choke']) {
      await page.locator(`button[aria-label^="${nameOf(id)}:"]`).click();
    }
    const tachometer = page.locator('[data-placement="tachometer"]');
    const rpm = tachometer.getByRole('img').first();
    const stopped = `${ctsl.indicators.tachometer?.name.en ?? 'Tachometer'}: 0 rpm`;
    await expect(rpm).toHaveAccessibleName(stopped);

    const ignition = nameOf('ignition');
    const key = page.getByRole('slider', { name: ignition, exact: true });
    await key.focus();
    await key.press('End');
    const start = page.getByRole('button', {
      name: `${ignition}: start`,
      exact: true,
    });
    await start.focus();
    await page.keyboard.down('Enter');
    try {
      await expect(key).toHaveAttribute('aria-valuetext', 'start');
      await expect(start).toBeInViewport({ ratio: 1 });
      await expect(tachometer).toBeInViewport({ ratio: 1 });
      await expect(rpm).not.toHaveAccessibleName(stopped);
      await expect(key).toHaveAttribute('aria-valuetext', 'start');
    } finally {
      await page.keyboard.up('Enter');
    }
  });
}

// #440: the app chrome follows the panel up to 4K instead of staying at its 1080p size.
const CHROME_SCALE_MIN = 1.5;
type ChromeText = Readonly<Record<string, readonly [string, 'fontSize' | 'lineHeight']>>;

const trainerText: ChromeText = {
  'header brand': ['.shell-brand-name', 'fontSize'],
  'mode button': ['.modes-segment', 'fontSize'],
  'checklist item': ['.checklist-item-text', 'fontSize'],
  'checklist line height': ['.checklist-item-text', 'lineHeight'],
  'dock hint': ['.dock-hint', 'fontSize'],
  'phase badge': ['.outside-view-caption', 'fontSize'],
  footer: ['.app-footer', 'fontSize'],
};

const pickerText: ChromeText = {
  'header brand': ['.shell-brand-name', 'fontSize'],
  'picker title': ['.picker-title', 'fontSize'],
  'procedure row': ['.picker-row-title', 'fontSize'],
  footer: ['.app-footer', 'fontSize'],
};

const chromeFontSizes = async (page: Page, text: ChromeText) =>
  new Map(
    await Promise.all(
      Object.entries(text).map(
        async ([name, [selector, property]]) =>
          [
            name,
            await page
              .locator(selector)
              .first()
              .evaluate(
                (element, key) => Number.parseFloat(getComputedStyle(element)[key]),
                property,
              ),
          ] as const,
      ),
    ),
  );

const expectChromeScaled = (hd: Map<string, number>, uhd: Map<string, number>) => {
  expect(uhd.size).toBeGreaterThan(0);
  for (const [name, size] of uhd) {
    const ratio = size / (hd.get(name) ?? Number.POSITIVE_INFINITY);
    expect(ratio, name).toBeGreaterThanOrEqual(CHROME_SCALE_MIN);
  }
};

test('the chrome text at 3840x2160 is at least 1.5 times its 1920x1080 size', async ({ page }) => {
  const sizes: Map<string, number>[] = [];
  for (const viewport of desktops) {
    await page.setViewportSize(viewport);
    await openAircraft(page, ctsl);
    await expect(cockpitLayout(page)).toHaveAttribute('data-cockpit-layout', 'combined');
    await expectNoPageScroll(page);
    sizes.push(await chromeFontSizes(page, trainerText));
  }
  const [hd, uhd] = sizes;
  expectChromeScaled(hd ?? new Map(), uhd ?? new Map());
});

test('the picker text at 3840x2160 is at least 1.5 times its 1920x1080 size', async ({ page }) => {
  const sizes: Map<string, number>[] = [];
  for (const viewport of desktops) {
    await page.setViewportSize(viewport);
    await openPicker(page);
    sizes.push(await chromeFontSizes(page, pickerText));
  }
  const [hd, uhd] = sizes;
  expectChromeScaled(hd ?? new Map(), uhd ?? new Map());
});

// #457: the panel frame fills the column the checklist stands beside, so no band opens under it.
const gapsBelowPanel = async (page: Page) => {
  const [surface, cockpit, footer, checklist] = await Promise.all([
    boxOf(page.locator('.panel-surface[data-cockpit]')),
    boxOf(page.locator('.panel-cockpit')),
    boxOf(page.getByRole('contentinfo')),
    boxOf(page.locator('.shell-checklist')),
  ]);
  return {
    belowChecklist: surface.y + surface.height - (checklist.y + checklist.height),
    frame: footer.y - (surface.y + surface.height),
    cockpit: footer.y - (cockpit.y + cockpit.height),
  };
};

test('the gap under the CTSL panel at 3840x2160 is no larger, in proportion, than at 1920x1080', async ({
  page,
}) => {
  const gaps: Record<'frame' | 'cockpit', number>[] = [];
  let belowChecklist = Number.POSITIVE_INFINITY;
  for (const viewport of desktops) {
    await page.setViewportSize(viewport);
    await openAircraft(page, ctsl);
    await expect(cockpitLayout(page)).toHaveAttribute('data-cockpit-layout', 'combined');
    await expectNoPageScroll(page);
    const measured = await gapsBelowPanel(page);
    belowChecklist = measured.belowChecklist;
    gaps.push({
      frame: measured.frame / viewport.height,
      cockpit: measured.cockpit / viewport.height,
    });
  }
  const [hd, uhd] = gaps;
  expect(Math.abs(belowChecklist), 'frame bottom against the checklist bottom').toBeLessThanOrEqual(
    1,
  );
  const pixel = 1 / 2160;
  expect(uhd?.frame ?? Number.POSITIVE_INFINITY, 'frame gap').toBeLessThanOrEqual(
    (hd?.frame ?? 0) + pixel,
  );
  expect(uhd?.cockpit ?? Number.POSITIVE_INFINITY, 'cockpit gap').toBeLessThanOrEqual(
    (hd?.cockpit ?? 0) + pixel,
  );
});

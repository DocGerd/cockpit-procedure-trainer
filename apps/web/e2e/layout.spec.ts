import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import { aircraftRegistry } from '../src/aircraft-registry';
import { openAircraft } from './legibility';

const desktops = [
  { width: 1920, height: 1080 },
  { width: 3840, height: 2160 },
];

const tablets = [
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
];

const cockpitLayout = (page: Page) => page.locator('.shell');

const themes = ['light', 'dark'] as const;

// A short desktop window falls back to the tabs.
const shortDesktop = { width: 1920, height: 980 };

async function expectNoPageScroll(page: Page) {
  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - window.innerWidth,
    y: document.documentElement.scrollHeight - window.innerHeight,
  }));
  expect(overflow, 'page scroll').toEqual({ x: 0, y: 0 });
  await expect(page.getByRole('contentinfo')).toBeInViewport({ ratio: 1 });
}

for (const aircraft of aircraftRegistry) {
  for (const viewport of desktops) {
    test(`${aircraft.id} shows every view at once at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openAircraft(page, aircraft);
      await expect(cockpitLayout(page)).toHaveAttribute('data-cockpit-layout', 'combined');
      await expect(page.getByRole('tablist')).toHaveCount(0);

      for (const [viewId, cell] of Object.entries(aircraft.cockpit?.views ?? {})) {
        const region = page.locator(`[data-view="${viewId}"]`);
        const box = await region.boundingBox();
        if (!box) throw new Error(`${viewId} has no region`);
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

      const overflow = await page.evaluate(() => ({
        x: document.documentElement.scrollWidth - window.innerWidth,
        y: document.documentElement.scrollHeight - window.innerHeight,
      }));
      expect(overflow, 'page scroll').toEqual({ x: 0, y: 0 });
    });

    test(`${aircraft.id} keeps the version and copyright footer clear at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openAircraft(page, aircraft);
      await expect(cockpitLayout(page)).toHaveAttribute('data-cockpit-layout', 'combined');
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
    });
  }

  for (const viewport of tablets) {
    test(`${aircraft.id} keeps the view tabs at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openAircraft(page, aircraft);
      await expect(cockpitLayout(page)).toHaveAttribute('data-cockpit-layout', 'tabs');
      await expect(page.getByRole('tablist')).toBeVisible();
      await expect(page.getByRole('tab')).toHaveCount(Object.keys(aircraft.views).length);
    });

    for (const theme of themes) {
      test(`${aircraft.id} does not scroll the page in the tabs at ${viewport.width}x${viewport.height} in ${theme}`, async ({
        page,
      }) => {
        await page.emulateMedia({ colorScheme: theme });
        await page.setViewportSize(viewport);
        await openAircraft(page, aircraft);
        await expect(cockpitLayout(page)).toHaveAttribute('data-cockpit-layout', 'tabs');
        await expectNoPageScroll(page);
      });
    }
  }

  test(`${aircraft.id} does not scroll the page at ${shortDesktop.width}x${shortDesktop.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(shortDesktop);
    await openAircraft(page, aircraft);
    await expect(cockpitLayout(page)).toHaveAttribute(
      'data-cockpit-layout',
      aircraft.id === 'ctsl' ? 'combined' : 'tabs',
    );
    await expectNoPageScroll(page);
  });
}

const ctsl = aircraftRegistry.find((entry) => entry.id === 'ctsl');
if (!ctsl) throw new Error('The aircraft registry has no CTSL');

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

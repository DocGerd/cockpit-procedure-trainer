import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { copyrightNotice, latestRelease } from '../src/version';
import { copy, openPicker, startProcedure } from './trainer';

const repoFile = (name: string) =>
  readFileSync(resolve(import.meta.dirname, '../../..', name), 'utf8');
const release = latestRelease(repoFile('CHANGELOG.md'));
const copyright = copyrightNotice(repoFile('LICENSE'));
const widths = [768, 1024, 1440, 1920];

async function expectFooterClear(page: Page) {
  const footer = page.getByRole('contentinfo');
  await expect(footer).toContainText(`${copy.shell.version} v${release}`);
  await expect(footer).toContainText(copyright ?? '');

  const viewport = page.viewportSize();
  const box = await footer.boundingBox();
  if (!viewport || !box) throw new Error('The footer has no box');
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  const covered = await page
    .locator('main button, main [role="radio"], main [role="tab"], header button')
    .evaluateAll(
      (controls, footerTop) =>
        controls.filter((control) => control.getBoundingClientRect().bottom > footerTop).length,
      box.y,
    );
  expect(covered, 'controls reaching into the footer').toBe(0);
}

test('the build derives the version and copyright shown', () => {
  expect(release).toBeDefined();
  expect(copyright).toBeDefined();
});

for (const width of widths) {
  test(`version and copyright are visible on the picker at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1080 });
    await openPicker(page);
    await page.getByRole('contentinfo').scrollIntoViewIfNeeded();
    await expectFooterClear(page);
  });

  test(`version and copyright stay visible in a procedure at ${width}px`, async ({ page }) => {
    await startProcedure(page, 'engineStart', 'guided');
    await page.setViewportSize({ width, height: 1080 });
    await expectFooterClear(page);
    await expect(page.getByRole('contentinfo')).toBeInViewport();
  });
}

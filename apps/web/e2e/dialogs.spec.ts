import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { aircraftRegistry } from '../src/aircraft-registry';
import { messages as aboutMessages } from '../src/shell/about.messages';
import { latestReleases } from '../src/shell/changelog';
import { copy, openPicker, operateUnrelatedControl, pickProcedure, procedure } from './trainer';

const about = aboutMessages.en;
const changelog = readFileSync(resolve(import.meta.dirname, '../../../CHANGELOG.md'), 'utf8');

async function askToChangeProcedure(page: Page) {
  await pickProcedure(page, 'engineStart', 'guided');
  await operateUnrelatedControl(page, 'flaps');
  await page
    .getByRole('banner')
    .getByRole('button', { name: procedure('engineStart').title.en })
    .click();
  return page.getByRole('alertdialog', { name: `${copy.shell.changeProcedure}?` });
}

const focusInside = (page: Page) =>
  page.evaluate(() => Boolean(document.activeElement?.closest('dialog[open]')));

test.describe('confirm dialog', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('keeps focus inside on a backdrop click, Tab and Shift+Tab', async ({ page }) => {
    const dialog = await askToChangeProcedure(page);
    await expect(dialog.getByRole('button', { name: copy.shell.cancel })).toBeFocused();

    await page.mouse.click(8, 8);
    await expect(dialog).toBeVisible();
    expect(await focusInside(page)).toBe(true);

    for (const key of ['Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
      await page.keyboard.press(key);
      expect(await focusInside(page), `focus after ${key}`).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(
      page.getByRole('banner').getByRole('button', { name: procedure('engineStart').title.en }),
    ).toBeFocused();
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`shows a destructive confirm beside a neutral Cancel in ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      const dialog = await askToChangeProcedure(page);
      const ink = (name: string) =>
        dialog
          .getByRole('button', { name, exact: true })
          .evaluate((button) => getComputedStyle(button).color);
      const token = (name: string) =>
        page.evaluate((property) => {
          const probe = document.createElement('span');
          probe.style.color = `var(${property})`;
          document.body.append(probe);
          const color = getComputedStyle(probe).color;
          probe.remove();
          return color;
        }, name);
      expect(await ink(copy.shell.changeProcedure)).toBe(await token('--color-danger'));
      expect(await ink(copy.shell.cancel)).toBe(await token('--color-text'));
    });
  }
});

test.describe('About', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('opens from the footer with both handbook revisions and the latest releases, fetching only its code', async ({
    page,
  }) => {
    await openPicker(page);
    const requests: string[] = [];
    page.on('request', (request) => {
      if (!['script', 'stylesheet'].includes(request.resourceType())) requests.push(request.url());
    });
    await page.getByRole('contentinfo').getByRole('button').click();
    const dialog = page.getByRole('dialog', { name: about.aboutTitle });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: about.close })).toBeFocused();

    for (const aircraft of aircraftRegistry) {
      await expect(dialog).toContainText(aircraft.handbookRevision.en);
    }
    const releases = latestReleases(changelog, 3);
    await expect(dialog.getByRole('heading', { level: 4 })).toHaveText(
      releases.map((release) => new RegExp(`^v${release.version.replaceAll('.', '\\.')}`)),
    );
    await expect(dialog.getByRole('link', { name: about.allReleaseNotes })).toHaveAttribute(
      'href',
      /\/releases$/,
    );
    expect(requests, 'requests other than the About code').toEqual([]);

    await page.mouse.click(8, 8);
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
});

const smallestText = (dialog: ReturnType<Page['getByRole']>) =>
  dialog.evaluate((root) => {
    const sizes = [...root.querySelectorAll('*')]
      .filter((element) =>
        [...element.childNodes].some(
          (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
        ),
      )
      .map((element) => parseFloat(getComputedStyle(element).fontSize));
    return Math.min(...sizes);
  });

test.describe('dialogs on a 4K screen', () => {
  test.use({ viewport: { width: 3840, height: 2160 } });

  test('scale the confirm dialog with the rest of the chrome', async ({ page }) => {
    const dialog = await askToChangeProcedure(page);
    await expect(dialog).toBeVisible();
    expect(await smallestText(dialog)).toBeGreaterThanOrEqual(22);
    const box = await dialog.boundingBox();
    expect(box?.width).toBeGreaterThan(900);
    const buttons = await dialog
      .getByRole('button')
      .evaluateAll((all) => all.map((button) => button.getBoundingClientRect().top));
    expect(new Set(buttons).size, 'Cancel and the confirm share a row').toBe(1);
  });

  test('scale every text in About and keep its links touch-sized', async ({ page }) => {
    await openPicker(page);
    await page.getByRole('contentinfo').getByRole('button').click();
    const dialog = page.getByRole('dialog', { name: about.aboutTitle });
    await expect(dialog).toBeVisible();
    expect(await smallestText(dialog)).toBeGreaterThanOrEqual(22);
    for (const link of await dialog.getByRole('link').all()) {
      expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(88);
    }
  });
});

test('Start stays clear of the footer on the tablet picker', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openPicker(page);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const start = page.getByRole('button', { name: copy.shell.startProcedure, exact: true });
  await expect(start).toBeInViewport({ ratio: 1 });
  const startBox = await start.boundingBox();
  const footerBox = await page.getByRole('contentinfo').boundingBox();
  if (!startBox || !footerBox) throw new Error('Start or the footer has no box');
  expect(startBox.y + startBox.height).toBeLessThanOrEqual(footerBox.y);
});

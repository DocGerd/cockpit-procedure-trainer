import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { aircraftRegistry } from '../src/aircraft-registry';
import { openAircraft, selectLanguage } from './legibility';
import {
  aircraft,
  copy,
  copyDe,
  openPicker,
  operateUnrelatedControl,
  pickProcedure,
  procedure,
} from './trainer';

test('the picker loads with the training-aid notice', async ({ page }) => {
  await openPicker(page);

  await expect(page.getByRole('button', { name: aircraft.name.en })).toBeVisible();
  for (const entry of Object.values(aircraft.procedures)) {
    await expect(page.getByRole('button', { name: entry.title.en })).toBeVisible();
  }
  await expect(
    page.getByRole('button', { name: copy.shell.startProcedure, exact: true }),
  ).toBeEnabled();

  const notice = page.getByRole('note', { name: copy.errors.noticeTitle });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText(copy.errors.noticeBody);
});

test('the language switches between English and German', async ({ page }) => {
  await openPicker(page);
  const german = page.getByRole('button', { name: copy.language.german });
  const english = page.getByRole('button', { name: copy.language.english });
  await expect(english).toHaveAttribute('aria-pressed', 'true');

  await german.click();
  await expect(german).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('heading', { level: 1, name: copyDe.shell.pickerTitle }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: aircraft.name.de })).toBeVisible();
  for (const entry of Object.values(aircraft.procedures)) {
    await expect(page.getByRole('button', { name: entry.title.de })).toBeVisible();
  }

  await english.click();
  await expect(english).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { level: 1, name: copy.shell.pickerTitle })).toBeVisible();
  await expect(page.getByRole('button', { name: aircraft.name.en })).toBeVisible();
});

test('the theme switches and is remembered', async ({ page }) => {
  await openPicker(page);

  await page.getByRole('button', { name: copy.shell.switchToDark }).click();
  await expect(page.getByRole('button', { name: copy.shell.switchToLight })).toBeVisible();
  await expect(page.getByRole('button', { name: copy.shell.switchToDark })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('button', { name: copy.shell.switchToLight })).toBeVisible();

  await page.getByRole('button', { name: copy.shell.switchToLight }).click();
  await expect(page.getByRole('button', { name: copy.shell.switchToDark })).toBeVisible();
});

// Asserts which theme-color tags the media queries leave active, not the colour the browser chrome
// shows: headless Chromium has no chrome to inspect.
for (const system of ['light', 'dark'] as const) {
  test(`the theme-color tag follows an explicit theme, not a ${system} system setting`, async ({
    page,
  }) => {
    const chosen = system === 'light' ? 'dark' : 'light';
    await page.emulateMedia({ colorScheme: system });
    await openPicker(page);

    const colour = (scheme: string) =>
      page.evaluate(
        (value) =>
          document.head.querySelector<HTMLMetaElement>(
            `meta[name="theme-color"][data-scheme="${value}"]`,
          )?.content,
        scheme,
      );
    const activeColours = () =>
      page.evaluate(() =>
        Array.from(document.head.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'))
          .filter((tag) => window.matchMedia(tag.media).matches)
          .map((tag) => tag.content),
      );
    const systemColour = await colour(system);
    const chosenColour = await colour(chosen);
    expect(systemColour).toBeTruthy();
    expect(chosenColour).toBeTruthy();
    expect(chosenColour).not.toBe(systemColour);
    expect(await activeColours()).toEqual([systemColour]);

    const switchTo = chosen === 'dark' ? copy.shell.switchToDark : copy.shell.switchToLight;
    await page.getByRole('button', { name: switchTo }).click();
    await expect.poll(activeColours).toEqual([chosenColour]);

    await page.reload();
    await expect.poll(activeColours).toEqual([chosenColour]);
  });
}

const headerViewports = [
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 3840, height: 2160 },
];

const languages = ['en', 'de'] as const;

for (const viewport of headerViewports) {
  for (const language of languages) {
    test(`the header items stay clear of each other with the rescue-system procedure in ${language} at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      const ctsl = aircraftRegistry.find((entry) => entry.id === 'ctsl');
      const rescue = ctsl?.procedures.rescueDeployment;
      if (!ctsl || !rescue) throw new Error('The CTSL has no rescue-system procedure');
      await page.setViewportSize(viewport);
      await openAircraft(page, ctsl, 'rescueDeployment');
      await selectLanguage(page, language);

      const header = page.getByRole('banner');
      await expect(header.getByRole('button', { name: rescue.title[language] })).toBeVisible();
      await expect(header.getByRole('button', { name: ctsl.name[language] })).toBeVisible();

      const layout = await header.evaluate((element) => {
        const visible = (target: Element) => {
          const { left, right, top, bottom } = target.getBoundingClientRect();
          return right - left > 1 && bottom - top > 1 ? { left, right, top, bottom } : undefined;
        };
        return [...element.children].flatMap((item) => {
          const box = visible(item);
          if (!box) return [];
          const parts = [...item.querySelectorAll('*')].flatMap((part) => {
            const partBox = visible(part);
            return partBox ? [{ name: part.className, ...partBox }] : [];
          });
          return [{ name: item.className, ...box, parts }];
        });
      });

      const clear = (a: { left: number; right: number }, b: { left: number; right: number }) =>
        a.right <= b.left + 0.5 || b.right <= a.left + 0.5;

      expect(layout.length, 'header items').toBeGreaterThan(4);
      for (const [at, item] of layout.entries()) {
        expect(item.left, `${item.name} left`).toBeGreaterThanOrEqual(-0.5);
        expect(item.right, `${item.name} right`).toBeLessThanOrEqual(viewport.width + 0.5);
        for (const part of item.parts) {
          expect(part.right, `${part.name} inside ${item.name}`).toBeLessThanOrEqual(
            item.right + 0.5,
          );
        }
        for (const other of layout.slice(at + 1)) {
          const stacked = item.bottom <= other.top + 0.5 || other.bottom <= item.top + 0.5;
          expect(stacked || clear(item, other), `${item.name} overlaps ${other.name}`).toBe(true);
        }
      }

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, 'page scroll').toBeLessThanOrEqual(0);
    });
  }
}

const chipViewports = [
  { width: 1366, height: 1024, hasTouch: true },
  { width: 1440, height: 900, hasTouch: false },
  { width: 1920, height: 1080, hasTouch: false },
  { width: 768, height: 1024, hasTouch: true },
];

for (const { hasTouch, ...viewport } of chipViewports) {
  test.describe(`header chip at ${viewport.width}x${viewport.height}${hasTouch ? ' with touch' : ''}`, () => {
    test.use({ viewport, hasTouch });

    const press = async (chip: Locator) => {
      if (hasTouch) await chip.tap();
      else await chip.click();
    };
    const picker = (page: Page) =>
      page.getByRole('heading', { level: 1, name: copy.shell.pickerTitle });

    test('acts in one step when nothing would be lost', async ({ page }) => {
      await pickProcedure(page, 'engineStart', 'guided');
      await press(page.getByRole('banner').getByRole('button', { name: aircraft.name.en }));
      await expect(page.getByRole('alertdialog')).toHaveCount(0);
      await expect(picker(page)).toBeVisible();
    });

    test('asks before it discards a deviation, and cancel keeps the run', async ({ page }) => {
      await pickProcedure(page, 'engineStart', 'guided');
      await operateUnrelatedControl(page, 'flaps');
      const header = page.getByRole('banner');
      const title = procedure('engineStart').title.en;

      await press(header.getByRole('button', { name: title }));
      const dialog = page.getByRole('alertdialog', { name: `${copy.shell.changeProcedure}?` });
      await expect(dialog).toContainText('1 deviation');
      await expect(dialog.getByRole('button', { name: copy.shell.changeProcedure })).toBeVisible();
      await press(dialog.getByRole('button', { name: copy.shell.cancel }));
      await expect(page.getByRole('alertdialog')).toHaveCount(0);
      await expect(picker(page)).toHaveCount(0);
      await expect(header.getByRole('button', { name: title })).toBeVisible();

      await press(header.getByRole('button', { name: title }));
      await press(
        page
          .getByRole('alertdialog')
          .getByRole('button', { name: copy.shell.changeProcedure, exact: true }),
      );
      await expect(picker(page)).toBeVisible();
    });
  });
}

for (const language of languages) {
  test(`a header chip names its full text and action in ${language} at tablet width`, async ({
    page,
  }) => {
    const ctsl = aircraftRegistry.find((entry) => entry.id === 'ctsl');
    const rescue = ctsl?.procedures.rescueDeployment;
    if (!ctsl || !rescue) throw new Error('The CTSL has no rescue-system procedure');
    await page.setViewportSize({ width: 1024, height: 768 });
    await openAircraft(page, ctsl, 'rescueDeployment');
    await selectLanguage(page, language);

    const header = page.getByRole('banner');
    const action = language === 'de' ? copyDe.shell : copy.shell;
    await expect(header.getByRole('button', { name: ctsl.name[language] })).toHaveAttribute(
      'title',
      `${action.changeAircraft}: ${ctsl.name[language]}`,
    );
    await expect(header.getByRole('button', { name: rescue.title[language] })).toHaveAttribute(
      'title',
      `${action.changeProcedure}: ${rescue.title[language]}`,
    );
  });
}

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1920, height: 950 },
]) {
  test(`the CTSL picker keeps Mode and Start in view without page scroll at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    const ctsl = aircraftRegistry.find((entry) => entry.id === 'ctsl');
    if (!ctsl) throw new Error('The aircraft registry has no CTSL');
    await page.setViewportSize(viewport);
    await openPicker(page);
    await page.getByRole('button', { name: ctsl.name.en }).click();

    const inside = async (locator: Locator, label: string) => {
      const box = await locator.boundingBox();
      if (!box) throw new Error(`${label} has no box`);
      expect(box.y, `${label} top`).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height, `${label} bottom`).toBeLessThanOrEqual(viewport.height);
    };
    await inside(page.getByRole('group', { name: copy.shell.mode }), 'Mode');
    await inside(
      page.getByRole('button', { name: copy.shell.startProcedure, exact: true }),
      'Start',
    );
    await inside(page.getByRole('button', { name: copy.shell.exploreCockpit }), 'Explore');

    const overflow = await page.evaluate(() => {
      const list = document.querySelector('.picker-list');
      return {
        page: document.documentElement.scrollHeight - document.documentElement.clientHeight,
        list: list ? list.scrollHeight - list.clientHeight : -1,
        listHeight: list?.clientHeight ?? 0,
      };
    });
    expect(overflow.page, 'page scroll').toBeLessThanOrEqual(0);
    expect(overflow.list, 'the list scrolls on its own').toBeGreaterThan(0);
    expect(overflow.listHeight, 'rows the list shows').toBeGreaterThanOrEqual(6 * 44);
  });
}

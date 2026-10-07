import { expect, test } from './fixtures';
import { aircraftRegistry } from '../src/aircraft-registry';
import { openAircraft, selectLanguage } from './legibility';
import { aircraft, copy, copyDe, openPicker } from './trainer';

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

test('a header chip is a one-tap link back to the picker at desktop width', async ({ page }) => {
  const ctsl = aircraftRegistry.find((entry) => entry.id === 'ctsl');
  if (!ctsl) throw new Error('The CTSL is not registered');
  await page.setViewportSize({ width: 1440, height: 900 });
  await openAircraft(page, ctsl, 'rescueDeployment');

  await page.getByRole('banner').getByRole('button', { name: ctsl.name.en }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: copy.shell.pickerTitle })).toBeVisible();
});

for (const language of languages) {
  test(`a header chip shows its full text in a dialog in ${language} at tablet width`, async ({
    page,
  }) => {
    const ctsl = aircraftRegistry.find((entry) => entry.id === 'ctsl');
    const rescue = ctsl?.procedures.rescueDeployment;
    if (!ctsl || !rescue) throw new Error('The CTSL has no rescue-system procedure');
    await page.setViewportSize({ width: 1024, height: 768 });
    await openAircraft(page, ctsl, 'rescueDeployment');
    await selectLanguage(page, language);

    const header = page.getByRole('banner');
    for (const full of [ctsl.name[language], rescue.title[language]]) {
      await header.getByRole('button', { name: full }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toHaveCount(1);
      await expect(dialog.getByText(full, { exact: true })).toBeVisible();
      const shown = await dialog.evaluate((element) => {
        const { left, right } = element.getBoundingClientRect();
        const value = element.querySelector('.shell-detail-value');
        return { left, right, clipped: value ? value.scrollWidth > value.clientWidth : true };
      });
      expect(shown.left, 'dialog left').toBeGreaterThanOrEqual(0);
      expect(shown.right, 'dialog right').toBeLessThanOrEqual(1024);
      expect(shown.clipped, 'dialog value clipped').toBe(false);
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
    }
  });
}

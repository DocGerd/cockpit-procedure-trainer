import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { aircraftRegistry } from '../src/aircraft-registry';
import { headerMessages } from '../src/shell/header.messages';
import { DEFAULT_VOLUME } from '../src/storage';
import { openAircraft, selectLanguage } from './legibility';
import { openPicker } from './trainer';

test.use({ seedSoundOff: false });

type Language = 'en' | 'de';

const header = (page: Page) => page.getByRole('banner');
const soundButton = (page: Page, language: Language = 'en') =>
  header(page).getByRole('button', { name: headerMessages[language].sound, exact: true });
const popover = (page: Page, language: Language = 'en') =>
  page.getByRole('dialog', { name: headerMessages[language].sound });

test('sound starts on at the default volume', async ({ page }) => {
  await openPicker(page);
  await soundButton(page).click();
  await expect(page.getByRole('switch', { name: 'Sound on' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  const slider = page.getByRole('slider', { name: 'Volume' });
  await expect(slider).toHaveValue(String(DEFAULT_VOLUME));
  await expect(slider).toBeEnabled();
});

test('sound off, sound on and the volume survive a reload', async ({ page }) => {
  await openPicker(page);
  await soundButton(page).click();
  await page.getByRole('slider', { name: 'Volume' }).fill('35');
  await page.getByRole('switch').click();
  await expect(page.getByRole('switch', { name: 'Sound off' })).toHaveAttribute(
    'aria-checked',
    'false',
  );

  await page.reload();
  await soundButton(page).click();
  await expect(page.getByRole('switch', { name: 'Sound off' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  const slider = page.getByRole('slider', { name: 'Volume' });
  await expect(slider).toHaveValue('35');
  await expect(slider).toBeDisabled();

  await page.getByRole('switch').click();
  await page.reload();
  await soundButton(page).click();
  await expect(page.getByRole('switch', { name: 'Sound on' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(slider).toHaveValue('35');
  await expect(slider).toBeEnabled();
});

test('the popover stays open for clicks inside it and closes on a click outside it', async ({
  page,
}) => {
  await openPicker(page);
  await soundButton(page).click();
  await page.getByRole('switch').click();
  await page.getByRole('switch').click();
  await page.getByRole('slider', { name: 'Volume' }).click();
  await expect(popover(page)).toBeVisible();
  await page.getByRole('heading', { level: 1 }).click();
  await expect(popover(page)).toHaveCount(0);
});

const trainerViewports = [
  { width: 1920, height: 1080 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
];

for (const viewport of trainerViewports) {
  for (const language of ['en', 'de'] as const) {
    test(`the trainer header holds the control beside the language switch, its popover on screen, in ${language} at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      const ctsl = aircraftRegistry.find((entry) => entry.id === 'ctsl');
      if (!ctsl) throw new Error('The registry has no CTSL');
      await page.setViewportSize(viewport);
      await openAircraft(page, ctsl, 'rescueDeployment');
      await selectLanguage(page, language);

      const classes = await header(page)
        .locator('.shell-controls > *')
        .evaluateAll((items) => items.map((item) => item.className.split(' ')));
      const at = (name: string) => classes.findIndex((names) => names.includes(name));
      expect(at('language-switch')).toBeGreaterThanOrEqual(0);
      expect(at('sound-control')).toBe(at('language-switch') + 1);
      expect(at('theme-switch')).toBe(at('sound-control') + 1);

      const sound = await soundButton(page, language).boundingBox();
      const theme = await header(page).locator('.theme-switch').boundingBox();
      if (!sound || !theme) throw new Error('header buttons not rendered');
      expect(sound.width).toBeGreaterThanOrEqual(44);
      expect(sound.height).toBeGreaterThanOrEqual(44);
      expect([sound.width, sound.height]).toEqual([theme.width, theme.height]);

      await soundButton(page, language).click();
      const box = await popover(page, language).boundingBox();
      if (!box) throw new Error('popover not rendered');
      expect(box.x, 'popover start edge').toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, 'popover end edge').toBeLessThanOrEqual(viewport.width);

      await page.getByRole('switch').click();
      await expect(
        page.getByRole('switch', { name: headerMessages[language].soundOff }),
      ).toHaveAttribute('aria-checked', 'false');
    });
  }
}

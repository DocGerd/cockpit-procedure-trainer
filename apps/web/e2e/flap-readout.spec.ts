import { ctslAircraft } from '@cpt/aircraft-ctsl';
import { demoAircraft } from '@cpt/aircraft-demo';
import { expect, test } from './fixtures';
import { openAircraft, showView } from './legibility';

const flapSelector = ctslAircraft.controls['flapSelector']?.name.en;
if (flapSelector === undefined) throw new Error('The CTSL has no flap selector');

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
});

test('ctsl: the flap readout blinks while the flaps travel and holds steady once there', async ({
  page,
}) => {
  await openAircraft(page, ctslAircraft, 'beforeLanding');
  const root = await showView(page, ctslAircraft, 'centre', 'en');
  const readout = root.locator('[data-placement="flapReadout"] [data-widget="digital-readout"]');
  await expect(readout).toHaveAttribute('aria-label', /: 15 °$/);
  await expect(readout).not.toHaveAttribute('data-blink');

  const selector = page.getByRole('slider', { name: flapSelector, exact: true });
  await selector.focus();
  await selector.press('ArrowRight');
  await expect(selector).toHaveAttribute('aria-valuetext', '30');
  await expect(readout).toHaveAttribute('data-blink', '');
  await expect(readout.locator('[data-value].pk-blink')).toHaveCount(1);

  await expect(readout).toHaveAttribute('aria-label', /: 30 °$/, { timeout: 20_000 });
  await expect(readout).not.toHaveAttribute('data-blink');
});

test('demo: no readout blinks', async ({ page }) => {
  await openAircraft(page, demoAircraft);
  await expect(page.locator('[data-widget="digital-readout"]').first()).toBeAttached();
  await expect(page.locator('[data-blink]')).toHaveCount(0);
});

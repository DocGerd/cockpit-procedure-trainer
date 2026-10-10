import { ctslAircraft } from '@cpt/aircraft-ctsl';
import { expect, test } from './fixtures';
import { openAircraft } from './legibility';

test('ctsl: the trim wheel steps from neutral to either end and back', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openAircraft(page, ctslAircraft, 'beforeTakeoff');
  const trim = page.getByRole('slider', { name: 'Trim wheel', exact: true });
  await expect(trim).toHaveAttribute('aria-valuetext', 'neutral');

  await trim.focus();
  for (const [key, positions] of [
    ['ArrowUp', ['half-down', 'nose-down', 'nose-down']],
    ['ArrowDown', ['half-down', 'neutral', 'half-up', 'nose-up', 'nose-up']],
    ['ArrowUp', ['half-up', 'neutral']],
  ] as const) {
    for (const position of positions) {
      await trim.press(key);
      await expect(trim).toHaveAttribute('aria-valuetext', position);
    }
  }
});

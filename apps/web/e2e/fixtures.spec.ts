import type { Page } from '@playwright/test';
import { expect, injectInlineScript, settleViolations, test } from './fixtures';
import { openPicker } from './trainer';

test.describe('the content security policy fixture', () => {
  test('records a violation and lets a test clear it', async ({ page, context, cspViolations }) => {
    await openPicker(page);
    await injectInlineScript(page);
    await settleViolations(context);
    expect(cspViolations).toHaveLength(1);
    cspViolations.length = 0;
  });

  test('records a violation in a second page of the same context', async ({
    context,
    cspViolations,
  }) => {
    const second = await context.newPage();
    await openPicker(second);
    await injectInlineScript(second);
    await settleViolations(context);
    expect(cspViolations).toHaveLength(1);
    cspViolations.length = 0;
  });

  test.describe('without clearing', () => {
    test.fail();

    // The body passes exactly as the first test does, so only the fixture teardown can fail it.
    test('fails a test that leaves a violation behind', async ({
      page,
      context,
      cspViolations,
    }) => {
      await openPicker(page);
      await injectInlineScript(page);
      await settleViolations(context);
      expect(cspViolations).toHaveLength(1);
    });
  });
});

const storedSound = (page: Page) => page.evaluate(() => window.localStorage.getItem('cpt.sound'));

test.describe('the sound seed fixture', () => {
  test('seeds sound off on a fresh profile', async ({ page }) => {
    await openPicker(page);
    expect(await storedSound(page)).toBe('off');
  });

  test('keeps a stored choice across a reload', async ({ page }) => {
    await openPicker(page);
    await page.evaluate(() => window.localStorage.setItem('cpt.sound', 'on'));
    await page.reload();
    expect(await storedSound(page)).toBe('on');
  });

  test.describe('with the option off', () => {
    test.use({ seedSoundOff: false });

    test('leaves the key absent', async ({ page }) => {
      await openPicker(page);
      expect(await storedSound(page)).toBeNull();
    });
  });
});

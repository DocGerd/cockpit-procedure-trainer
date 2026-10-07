import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { openPicker } from './trainer';

const injectInlineScript = (page: Page) =>
  page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'window.__cspProbe = true;';
    document.head.append(script);
  });

test.describe('the content security policy fixture', () => {
  test('records a violation and lets a test clear it', async ({ page, cspViolations }) => {
    await openPicker(page);
    await injectInlineScript(page);
    await expect.poll(() => cspViolations.length).toBeGreaterThan(0);
    cspViolations.length = 0;
  });

  test.describe('without clearing', () => {
    test.fail();

    test('fails a test that leaves a violation behind', async ({ page, cspViolations }) => {
      await openPicker(page);
      await injectInlineScript(page);
      await expect.poll(() => cspViolations.length).toBeGreaterThan(0);
    });
  });
});

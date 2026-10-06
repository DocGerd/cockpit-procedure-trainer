import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { aircraftRegistry } from '../src/aircraft-registry';
import { contentSecurityPolicy } from '../src/csp';
import { openAircraft, showView } from './legibility';
import { openPicker } from './trainer';

const VIOLATION_BINDING = '__reportCspViolation';
const POLICY_META = 'meta[http-equiv="Content-Security-Policy"]';

async function watchViolations(page: Page): Promise<string[]> {
  const violations: string[] = [];
  await page.exposeFunction(VIOLATION_BINDING, (description: string) => {
    violations.push(description);
  });
  await page.addInitScript((binding) => {
    document.addEventListener(
      'securitypolicyviolation',
      (event) =>
        void (window as unknown as Record<string, (text: string) => void>)[binding]?.(
          `${event.effectiveDirective} blocked ${event.blockedURI || 'inline'} at ${event.sourceFile}:${event.lineNumber}`,
        ),
      true,
    );
  }, VIOLATION_BINDING);
  return violations;
}

async function expectPolicyEnforced(page: Page, violations: string[]) {
  await expect(page.locator(POLICY_META)).toHaveAttribute('content', contentSecurityPolicy());
  await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'window.__cspProbe = true;';
    document.head.append(script);
  });
  await expect.poll(() => violations.length).toBeGreaterThan(0);
  expect(await page.evaluate(() => '__cspProbe' in window)).toBe(false);
  violations.length = 0;
}

async function visitEveryView(page: Page, violations: string[]) {
  for (const aircraft of aircraftRegistry) {
    await openAircraft(page, aircraft);
    for (const viewId of Object.keys(aircraft.views)) {
      await showView(page, aircraft, viewId, 'en');
    }
    await page.waitForLoadState('networkidle');
    expect(violations, aircraft.id).toEqual([]);
  }
}

const isControlled = (page: Page) =>
  page.waitForFunction(() => navigator.serviceWorker.controller !== null);

test.describe('the content security policy', () => {
  test('is enforced, and no aircraft or view violates it', async ({ page }) => {
    const violations = await watchViolations(page);
    await openPicker(page);
    await expectPolicyEnforced(page, violations);
    await visitEveryView(page, violations);
  });

  test.describe('with the service worker active', () => {
    test.use({ serviceWorkers: 'allow' });

    test('is enforced, and no aircraft or view violates it', async ({ page, context }) => {
      const violations = await watchViolations(page);
      await openPicker(page);
      await isControlled(page);
      await page.reload();
      await isControlled(page);
      await expectPolicyEnforced(page, violations);
      await visitEveryView(page, violations);

      await context.setOffline(true);
      await page.reload();
      await expectPolicyEnforced(page, violations);
      await visitEveryView(page, violations);
    });
  });
});

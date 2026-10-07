import { expect, test as base } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';

const VIOLATION_BINDING = '__reportCspViolation';

/** Appends an inline script, which the policy blocks, so a violation event follows. */
export const injectInlineScript = (page: Page) =>
  page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'window.__cspProbe = true;';
    document.head.append(script);
  });

/**
 * A round trip through each open page's task queue: a violation raised before it is queued
 * ahead of the reply, and its report travels the same channel, so it has arrived afterwards.
 */
export const settleViolations = (context: BrowserContext) =>
  Promise.all(context.pages().map((page) => page.evaluate(() => undefined).catch(() => undefined)));

export const test = base.extend<{ cspViolations: string[] }>({
  cspViolations: [
    async ({ context }, use) => {
      const violations: string[] = [];
      await context.exposeFunction(VIOLATION_BINDING, (description: string) => {
        violations.push(description);
      });
      await context.addInitScript((binding) => {
        document.addEventListener(
          'securitypolicyviolation',
          (event) =>
            void (window as unknown as Record<string, (text: string) => void>)[binding]?.(
              `${event.effectiveDirective} blocked ${event.blockedURI || 'inline'} at ${event.sourceFile}:${event.lineNumber}`,
            ),
          true,
        );
      }, VIOLATION_BINDING);
      await use(violations);
      await settleViolations(context);
      expect(violations, 'content security policy violations').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

import { expect, test as base } from '@playwright/test';

const VIOLATION_BINDING = '__reportCspViolation';

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
      expect(violations, 'content security policy violations').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

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

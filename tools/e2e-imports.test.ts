import { ESLint } from 'eslint';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: resolve(import.meta.dirname, '..') });

async function restricted(filePath: string, code: string): Promise<number> {
  const [result] = await eslint.lintText(code, { filePath });
  return result?.messages.filter((m) => m.ruleId === 'no-restricted-imports').length ?? 0;
}

describe('e2e fixture import', () => {
  it('rejects a value import from @playwright/test in a spec', async () => {
    expect(
      await restricted(
        'apps/web/e2e/x.spec.ts',
        "import { expect, test } from '@playwright/test';\n",
      ),
    ).toBe(1);
  });

  it('allows a type import from @playwright/test in a spec', async () => {
    expect(
      await restricted('apps/web/e2e/x.spec.ts', "import type { Page } from '@playwright/test';\n"),
    ).toBe(0);
  });

  it('allows a value import from @playwright/test in a helper', async () => {
    expect(
      await restricted('apps/web/e2e/x.ts', "import { expect } from '@playwright/test';\n"),
    ).toBe(0);
  });
});

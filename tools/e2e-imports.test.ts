import { ESLint } from 'eslint';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: resolve(import.meta.dirname, '..') });

async function count(ruleId: string, filePath: string, code: string): Promise<number> {
  const [result] = await eslint.lintText(code, { filePath });
  return result?.messages.filter((m) => m.ruleId === ruleId).length ?? 0;
}

const restricted = (filePath: string, code: string) =>
  count('no-restricted-imports', filePath, code);
const restrictedSyntax = (filePath: string, code: string) =>
  count('no-restricted-syntax', filePath, code);

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

  it('rejects a relative import into packages/ in a spec', async () => {
    expect(
      await restricted(
        'apps/web/e2e/x.spec.ts',
        "import { SWEEP_END } from '../../../packages/panel-kit/src/indicators/geometry';\n",
      ),
    ).toBe(1);
  });

  it('rejects a relative import into packages/ in an e2e helper', async () => {
    expect(
      await restricted('apps/web/e2e/x.ts', "import { a } from '../../../packages/core/src/a';\n"),
    ).toBe(1);
  });

  it('rejects a non-normalised relative import into packages/', async () => {
    expect(
      await restricted(
        'apps/web/e2e/x.ts',
        "import { a } from '../e2e/../../../packages/core/src/a';\n",
      ),
    ).toBe(1);
  });

  it('rejects a dynamic relative import into packages/ in a spec', async () => {
    expect(
      await restrictedSyntax(
        'apps/web/e2e/x.spec.ts',
        "await import('../../../packages/core/src/a');\n",
      ),
    ).toBe(1);
  });

  it('rejects a dynamic relative import into packages/ in an e2e helper', async () => {
    expect(
      await restrictedSyntax(
        'apps/web/e2e/x.ts',
        "await import('../../../packages/core/src/a');\n",
      ),
    ).toBe(1);
  });

  it('rejects a dynamic non-normalised import into packages/', async () => {
    expect(
      await restrictedSyntax(
        'apps/web/e2e/x.ts',
        "await import('../e2e/../../../packages/core/src/a');\n",
      ),
    ).toBe(1);
  });

  it('allows a dynamic relative import of another e2e file', async () => {
    expect(await restrictedSyntax('apps/web/e2e/x.ts', "await import('./helpers');\n")).toBe(0);
  });

  it('rejects a dynamic @playwright/test import in a spec', async () => {
    expect(
      await restrictedSyntax('apps/web/e2e/x.spec.ts', "await import('@playwright/test');\n"),
    ).toBe(1);
  });

  it('allows a dynamic @playwright/test import in a helper', async () => {
    expect(await restrictedSyntax('apps/web/e2e/x.ts', "await import('@playwright/test');\n")).toBe(
      0,
    );
  });

  it.each(['mts', 'cts'])('covers .%s e2e files', async (ext) => {
    expect(
      await restricted(
        `apps/web/e2e/x.${ext}`,
        "import { a } from '../../../packages/core/src/a';\n",
      ),
    ).toBe(1);
    expect(
      await restrictedSyntax(
        `apps/web/e2e/x.${ext}`,
        "await import('../../../packages/core/src/a');\n",
      ),
    ).toBe(1);
    expect(
      await restricted(`apps/web/e2e/x.spec.${ext}`, "import { test } from '@playwright/test';\n"),
    ).toBe(1);
    expect(
      await restrictedSyntax(`apps/web/e2e/x.spec.${ext}`, "await import('@playwright/test');\n"),
    ).toBe(1);
  });
});

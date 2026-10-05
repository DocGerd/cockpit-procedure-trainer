import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint();

async function restricted(filePath: string, code: string): Promise<number> {
  const [result] = await eslint.lintText(code, { filePath });
  return result?.messages.filter((m) => m.ruleId === 'no-restricted-imports').length ?? 0;
}

describe('package boundaries', () => {
  it('rejects UI imports in core', async () => {
    expect(await restricted('packages/core/src/x.ts', "import 'react';\n")).toBe(1);
  });

  it('rejects asset imports in core', async () => {
    expect(await restricted('packages/core/src/x.ts', "import './panel.png';\n")).toBe(1);
  });

  it('rejects panel-kit imports in an aircraft', async () => {
    expect(await restricted('packages/aircraft-demo/src/x.ts', "import '@cpt/panel-kit';\n")).toBe(
      1,
    );
  });

  it('rejects another aircraft import in an aircraft', async () => {
    expect(await restricted('packages/aircraft-demo/src/x.ts', "import '@cpt/aircraft-b';\n")).toBe(
      1,
    );
  });

  it('allows core imports in an aircraft', async () => {
    expect(await restricted('packages/aircraft-demo/src/x.ts', "import '@cpt/core';\n")).toBe(0);
  });

  it('rejects aircraft imports in panel-kit', async () => {
    expect(await restricted('packages/panel-kit/src/x.tsx', "import '@cpt/aircraft-demo';\n")).toBe(
      1,
    );
  });

  it('rejects aircraft imports in the app outside the registry', async () => {
    expect(await restricted('apps/web/src/App.tsx', "import '@cpt/aircraft-demo';\n")).toBe(1);
  });

  it('allows aircraft imports in the registry', async () => {
    expect(
      await restricted('apps/web/src/aircraft-registry.ts', "import '@cpt/aircraft-demo';\n"),
    ).toBe(0);
  });

  it('rejects device imports in the app outside the device registry', async () => {
    expect(await restricted('apps/web/src/App.tsx', "import '@cpt/device-com';\n")).toBe(1);
  });

  it('rejects a relative import into another package from an aircraft', async () => {
    expect(
      await restricted('packages/aircraft-demo/src/x.ts', "import '../../core/src/index';\n"),
    ).toBe(1);
  });

  it('rejects a relative import into another package from the app registry', async () => {
    expect(
      await restricted(
        'apps/web/src/aircraft-registry.ts',
        "import '../../../packages/aircraft-demo/src/index';\n",
      ),
    ).toBe(1);
  });

  it('allows a relative import within the same package', async () => {
    expect(await restricted('packages/aircraft-demo/src/x.ts', "import './index';\n")).toBe(0);
  });
});

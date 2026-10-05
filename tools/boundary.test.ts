import { ESLint } from 'eslint';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const eslint = new ESLint({ cwd: root });

async function count(ruleId: string, filePath: string, code: string): Promise<number> {
  const [result] = await eslint.lintText(code, { filePath });
  return result?.messages.filter((m) => m.ruleId === ruleId).length ?? 0;
}

const restricted = (filePath: string, code: string) =>
  count('no-restricted-imports', filePath, code);
const restrictedSyntax = (filePath: string, code: string) =>
  count('no-restricted-syntax', filePath, code);

describe('package boundaries', () => {
  it('loads the config from any working directory', () => {
    const config = pathToFileURL(resolve(root, 'eslint.config.js')).href;
    expect(() =>
      execFileSync(process.execPath, ['--input-type=module', '-e', `await import('${config}')`], {
        cwd: tmpdir(),
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });

  it('rejects UI imports in core', async () => {
    expect(await restricted('packages/core/src/x.ts', "import 'react';\n")).toBe(1);
  });

  it('rejects asset imports in core', async () => {
    expect(await restricted('packages/core/src/x.ts', "import './panel.png';\n")).toBe(1);
  });

  it.each([
    ['./panel.jpeg'],
    ['./click.mp3'],
    ['./panel.css?raw'],
    ['./panel.svg?url'],
    ['./panel.svg?url&no-inline'],
    ['./panel.css?raw&inline'],
    ['./panel.svg?url#frag'],
  ])('rejects asset import %s in core', async (path) => {
    expect(await restricted('packages/core/src/x.ts', `import '${path}';\n`)).toBe(1);
  });

  it('allows a core import whose name merely ends in raw', async () => {
    expect(await restricted('packages/core/src/x.ts', "import './draw';\n")).toBe(0);
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

  it('rejects panel-kit imports in core', async () => {
    expect(await restricted('packages/core/src/x.ts', "import '@cpt/panel-kit';\n")).toBe(1);
  });

  it('rejects React imports in an aircraft', async () => {
    expect(await restricted('packages/aircraft-demo/src/x.ts', "import 'react';\n")).toBe(1);
  });

  it('rejects web imports in panel-kit', async () => {
    expect(await restricted('packages/panel-kit/src/x.tsx', "import '@cpt/web';\n")).toBe(1);
  });

  it('allows device imports in the device registry', async () => {
    expect(await restricted('apps/web/src/device-registry.ts', "import '@cpt/device-com';\n")).toBe(
      0,
    );
  });

  it('rejects a dynamic aircraft import in the app outside the registry', async () => {
    expect(
      await restrictedSyntax('apps/web/src/x.ts', "await import('@cpt/aircraft-demo');\n"),
    ).toBe(1);
  });

  it('rejects a dynamic device import in the app outside the registry', async () => {
    expect(await restrictedSyntax('apps/web/src/x.ts', "await import('@cpt/device-com');\n")).toBe(
      1,
    );
  });

  it('rejects import.meta.glob over aircraft packages outside the registry', async () => {
    expect(
      await restrictedSyntax(
        'apps/web/src/x.ts',
        "import.meta.glob('../../../packages/aircraft-*/src/index.ts');\n",
      ),
    ).toBe(1);
  });

  it('allows import.meta.glob unrelated to aircraft or devices', async () => {
    expect(
      await restrictedSyntax('apps/web/src/x.ts', "import.meta.glob('./assets/*.png');\n"),
    ).toBe(0);
  });

  it('allows a dynamic aircraft import in the registry', async () => {
    expect(
      await restrictedSyntax(
        'apps/web/src/aircraft-registry.ts',
        "await import('@cpt/aircraft-demo');\n",
      ),
    ).toBe(0);
  });

  it('rejects a dynamic panel-kit import in an aircraft', async () => {
    expect(
      await restrictedSyntax(
        'packages/aircraft-demo/src/x.ts',
        "await import('@cpt/panel-kit');\n",
      ),
    ).toBe(1);
  });

  it('allows a dynamic core import in an aircraft', async () => {
    expect(
      await restrictedSyntax('packages/aircraft-demo/src/x.ts', "await import('@cpt/core');\n"),
    ).toBe(0);
  });

  it('rejects a dynamic relative import into another package', async () => {
    expect(
      await restrictedSyntax(
        'packages/aircraft-demo/src/x.ts',
        "await import('../../core/src/index');\n",
      ),
    ).toBe(1);
  });
});

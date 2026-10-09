import { ESLint } from 'eslint';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
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

  it('rejects a substitution-free template dynamic import across a package boundary', async () => {
    expect(
      await restrictedSyntax('apps/web/src/x.ts', 'await import(`@cpt/aircraft-demo`);\n'),
    ).toBe(1);
    expect(
      await restrictedSyntax(
        'packages/aircraft-demo/src/x.ts',
        'await import(`../../core/src/index`);\n',
      ),
    ).toBe(1);
  });

  it('allows a substitution-free template dynamic import of an allowed dependency', async () => {
    expect(
      await restrictedSyntax('packages/aircraft-demo/src/x.ts', 'await import(`@cpt/core`);\n'),
    ).toBe(0);
  });
});

describe('module-flavoured sources in known package kinds', () => {
  it.each([
    ['packages/core/src/x', '@cpt/panel-kit'],
    ['packages/panel-kit/src/x', '@cpt/web'],
    ['packages/aircraft-demo/src/x', '@cpt/panel-kit'],
    ['packages/device-x/src/x', '@cpt/web'],
    ['packages/device-x/src/screen/x', '@cpt/web'],
    ['packages/device-x/src/logic/x', '@cpt/panel-kit'],
  ])('rejects a forbidden import in %s as .ts, .mts and .cts', async (base, forbidden) => {
    for (const ext of ['ts', 'mts', 'cts']) {
      expect(await restricted(`${base}.${ext}`, `import '${forbidden}';\n`)).toBe(1);
      expect(await restrictedSyntax(`${base}.${ext}`, `await import('${forbidden}');\n`)).toBe(1);
    }
  });

  it.each([
    ['packages/panel-kit/src/x', "export const w = '12px';\n"],
    ['packages/panel-kit/src/x.test', "export const c = '#fff';\n"],
    ['packages/device-x/src/screen/x', "export const w = '12px';\n"],
    ['packages/device-x/src/screen/x.test', "export const c = '#fff';\n"],
    ['apps/web/src/x', "export const w = '12px';\n"],
    ['apps/web/src/x.test', "export const c = '#fff';\n"],
  ])('rejects a literal in %s as .ts, .mts and .cts', async (base, code) => {
    for (const ext of ['ts', 'mts', 'cts']) {
      expect(await restrictedSyntax(`${base}.${ext}`, code)).toBe(1);
    }
  });
});

describe('unknown package kinds', () => {
  it.each([
    ['packages/widget-x/src/x.ts'],
    ['packages/widget-x/src/x.tsx'],
    ['packages/widget-x/vite.config.ts'],
    ['packages/widget-x/src/x.mts'],
    ['packages/widget-x/src/x.cts'],
    ['packages/devices/src/x.ts'],
    ['packages/aircraft/src/x.ts'],
  ])('rejects %s, a package matching no known kind', async (filePath) => {
    expect(await restrictedSyntax(filePath, 'export {};\n')).toBe(1);
  });

  it.each([
    ['packages/core/src/x.ts'],
    ['packages/panel-kit/src/x.tsx'],
    ['packages/aircraft-demo/src/x.ts'],
    ['packages/device-x/src/x.ts'],
    ['packages/device-x/src/screen/x.tsx'],
  ])('accepts %s, a package of a known kind', async (filePath) => {
    expect(await restrictedSyntax(filePath, 'export {};\n')).toBe(0);
  });
});

describe('every package under packages/', () => {
  const kinds = [
    { kind: 'core', matches: (dir: string) => dir === 'core', forbidden: 'react' },
    { kind: 'panel-kit', matches: (dir: string) => dir === 'panel-kit', forbidden: '@cpt/web' },
    {
      kind: 'aircraft',
      matches: (dir: string) => dir.startsWith('aircraft-'),
      forbidden: '@cpt/panel-kit',
    },
    {
      kind: 'device',
      matches: (dir: string) => dir.startsWith('device-'),
      forbidden: '@cpt/web',
    },
  ];
  const dirs = readdirSync(resolve(root, 'packages'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  it.each(dirs)('%s is of exactly one known kind', (dir) => {
    expect(kinds.filter((k) => k.matches(dir))).toHaveLength(1);
  });

  it.each(dirs)('%s is bounded by its kind and rejects a forbidden import', async (dir) => {
    const file = `packages/${dir}/src/x.ts`;
    const kind = kinds.find((k) => k.matches(dir));
    expect(await restrictedSyntax(file, 'export {};\n')).toBe(0);
    expect(await restricted(file, `import '${kind?.forbidden}';\n`)).toBe(1);
  });
});

describe('device package boundaries', () => {
  const logic = 'packages/device-x/src/logic/x.ts';
  const screen = 'packages/device-x/src/screen/x.tsx';
  const entry = 'packages/device-x/src/index.ts';

  it.each([['react'], ['react-dom/client'], ['@cpt/panel-kit']])(
    'rejects %s in device logic',
    async (name) => {
      expect(await restricted(logic, `import '${name}';\n`)).toBe(1);
      expect(await restrictedSyntax(logic, `await import('${name}');\n`)).toBe(1);
    },
  );

  it.each([[screen], [entry]])('allows panel-kit in %s', async (filePath) => {
    expect(await restricted(filePath, "import '@cpt/panel-kit';\n")).toBe(0);
    expect(await restrictedSyntax(filePath, "await import('@cpt/panel-kit');\n")).toBe(0);
  });

  it.each([[logic], [screen], [entry]])('allows core in %s', async (filePath) => {
    expect(await restricted(filePath, "import '@cpt/core';\n")).toBe(0);
    expect(await restrictedSyntax(filePath, "await import('@cpt/core');\n")).toBe(0);
  });

  it.each([[logic], [screen], [entry]])(
    'rejects aircraft, device and web imports in %s',
    async (filePath) => {
      for (const name of ['@cpt/aircraft-demo', '@cpt/device-y', '@cpt/web']) {
        expect(await restricted(filePath, `import '${name}';\n`)).toBe(1);
        expect(await restrictedSyntax(filePath, `await import('${name}');\n`)).toBe(1);
      }
    },
  );

  it.each([['../../core/src'], ['../../aircraft-demo/src'], ['../../device-y/src']])(
    'rejects a relative import of %s from every part of a device package',
    async (path) => {
      for (const filePath of [logic, screen, entry]) {
        expect(await restricted(filePath, `import '${path}';\n`)).toBe(1);
        expect(await restrictedSyntax(filePath, `await import('${path}');\n`)).toBe(1);
      }
    },
  );

  it('rejects a relative import that climbs further out to another package', async () => {
    expect(await restricted(screen, "import '../../../core/src/index';\n")).toBe(1);
    expect(await restricted(screen, "import '../../../../device-y/src/index';\n")).toBe(1);
    expect(await restricted(screen, "import '../../../../apps/web/src/App';\n")).toBe(1);
  });

  it('allows a relative import inside its own package', async () => {
    expect(await restricted(screen, "import '../logic/x';\n")).toBe(0);
    expect(await restricted(entry, "import './screen/x';\n")).toBe(0);
    expect(await restrictedSyntax(screen, "await import('../logic/x');\n")).toBe(0);
  });

  it.each([['./face.png'], ['./face.css?raw'], ['./face.svg?url'], ['./face.svg?url&no-inline']])(
    'rejects asset import %s in device logic',
    async (path) => {
      expect(await restricted(logic, `import '${path}';\n`)).toBe(1);
    },
  );
});

import { ESLint } from 'eslint';
import { resolve } from 'node:path';
import stylelint from 'stylelint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: resolve(import.meta.dirname, '..') });
const configFile = resolve(import.meta.dirname, '../stylelint.config.mjs');

async function eslintCount(ruleId: string, filePath: string, code: string): Promise<number> {
  const [result] = await eslint.lintText(code, { filePath });
  return result?.messages.filter((m) => m.ruleId === ruleId).length ?? 0;
}

const literals = (filePath: string, code: string) =>
  eslintCount('no-restricted-syntax', filePath, code);

const repoRoot = resolve(import.meta.dirname, '..');

async function cssWarnings(filePath: string, code: string): Promise<number> {
  const result = await stylelint.lint({
    code,
    codeFilename: resolve(repoRoot, filePath),
    configFile,
    cwd: repoRoot,
  });
  return result.results.reduce((total, r) => total + r.warnings.length, 0);
}

describe('colour literals in TS and TSX', () => {
  const web = 'apps/web/src/x.tsx';

  it.each([
    ["const c = '#6A57C4';\n"],
    ["const c = 'solid #fff';\n"],
    ['const c = `border: solid #abc`;\n'],
    ["const c = 'rgb(0 0 0)';\n"],
    ["const c = 'oklch(60% 0.1 280)';\n"],
    ['const c = `hsl(${hue} 50% 50%)`;\n'],
  ])('rejects %s in the web app', async (code) => {
    expect(await literals(web, code)).toBe(1);
  });

  it('allows a token reference', async () => {
    expect(await literals(web, "const c = 'var(--color-accent)';\n")).toBe(0);
  });

  it('reports a colour and a length in one string separately', async () => {
    expect(await literals(web, "const c = '1px solid #fff';\n")).toBe(2);
  });

  describe.each(covered.filter((file) => file.endsWith('.tsx')))('in JSX of %s', (file) => {
    it.each([
      ['const e = <div style={{ padding: 8 }} />;\n'],
      ['const e = <div style={{ fontSize: 14 }} />;\n'],
      ["const e = <div style={{ margin: '12px' }} />;\n"],
      ['const e = <text fontSize={12} />;\n'],
      ['const e = <text fontSize="12" />;\n'],
      ['const e = <text fontFamily="Arial" />;\n'],
      ['const e = <text fontFamily="my-brand-font" />;\n'],
      ['const e = <text letterSpacing={1} />;\n'],
    ])('rejects %s', async (code) => {
      expect(await literals(file, code)).toBe(1);
    });

    it.each([
      ['const e = <div style={{ padding: 0 }} />;\n'],
      ['const e = <text fontSize="var(--text-sm)" />;\n'],
      ['const e = <text fontSize={0} />;\n'],
      ['const e = <svg viewBox="0 0 120 80"><circle cx={60} cy={40} r={12} /></svg>;\n'],
    ])('allows %s', async (code) => {
      expect(await literals(file, code)).toBe(0);
    });
  });

  it('leaves aircraft packages alone', async () => {
    expect(await literals('packages/aircraft-demo/src/x.ts', "const c = 'rgb(0 0 0)';\n")).toBe(0);
  });

  it('applies in the registries too', async () => {
    expect(await literals('apps/web/src/aircraft-registry.ts', "const c = '#fff';\n")).toBe(1);
  });
});

const covered = [
  'apps/web/src/x.tsx',
  'apps/web/src/aircraft-registry.ts',
  'packages/panel-kit/src/x.tsx',
  'packages/device-x/src/screen/x.tsx',
];

describe('colour literals in panel code', () => {
  it.each(covered.slice(2))('rejects a hex colour in %s', async (file) => {
    expect(await literals(file, "const c = '#6A57C4';\n")).toBe(1);
  });

  it.each(covered.slice(2))('allows a token reference in %s', async (file) => {
    expect(await literals(file, "const c = 'var(--panel-bezel)';\n")).toBe(0);
  });
});

describe('type and spacing literals in TS and TSX', () => {
  describe.each(covered)('in %s', (file) => {
    it.each([
      ["const s = '12px';\n"],
      ["const s = '0.5rem';\n"],
      ["const s = '1.25em';\n"],
      ["const s = '1px solid var(--color-line)';\n"],
      ['const s = `${n}rem`;\n'],
      ['const s = `${n}px`;\n'],
      ['const s = `12px`;\n'],
      ["const f = 'Geist';\n"],
      ["const f = 'Arial';\n"],
      ["const f = 'Geist Mono';\n"],
      ['const f = "\'Geist\', system-ui, sans-serif";\n'],
      ["const f = 'monospace';\n"],
      ["const s = { fontFamily: 'Inter' };\n"],
      ["const s = { fontFamily: 'my-brand-font' };\n"],
      ['const s = { fontSize: 14 };\n'],
      ['const s = { lineHeight: 1.5 };\n'],
      ['const s = { letterSpacing: 0.5 };\n'],
      ['const s = { padding: 8 };\n'],
      ['const s = { paddingInline: 8 };\n'],
      ['const s = { margin: -4 };\n'],
      ['const s = { marginTop: 4 };\n'],
      ['const s = { gap: 12 };\n'],
      ['const s = { rowGap: 12 };\n'],
      ["const s = { gap: '12' };\n"],
    ])('rejects %s', async (code) => {
      expect(await literals(file, code)).toBe(1);
    });

    it('reports each length in a template separately', async () => {
      expect(await literals(file, 'const s = `${a}px ${b}px`;\n')).toBe(2);
    });

    it.each([
      ["const s = 'var(--space-4)';\n"],
      ["const s = 'calc(var(--space-2) * 2)';\n"],
      ["const s = { padding: 'var(--space-4)' };\n"],
      ["const s = { fontFamily: 'var(--font-sans)' };\n"],
      ["const s = { fontFamily: 'inherit' };\n"],
      ['const s = { padding: 0 };\n'],
      ['const s = { gap: 0 };\n'],
      ['const s = { padding: n };\n'],
      ['const s = { padding: `calc(${n} * var(--space-1))` };\n'],
      ['const p = { x: 10, y: 20, width: 100, height: 40, strokeWidth: 2 };\n'],
      ['const n = [12, 24, 1.5];\n'],
      ["const t = 'item 3 of 12';\n"],
      ["const t = 'Itemised';\n"],
      ['const t = `item ${n} of 12`;\n'],
      ['const t = `em dash ${n}`;\n'],
      ['const t = `px ${n}`;\n'],
      ["const t = 'Emergency 12 items';\n"],
    ])('allows %s', async (code) => {
      expect(await literals(file, code)).toBe(0);
    });
  });

  it('leaves aircraft packages alone', async () => {
    expect(
      await literals(
        'packages/aircraft-demo/src/x.tsx',
        "const s = { padding: 8, fontFamily: 'Arial', gap: '12px' };\n",
      ),
    ).toBe(0);
  });

  it('leaves device logic alone', async () => {
    expect(await literals('packages/device-x/src/logic/x.ts', "const s = '12px';\n")).toBe(0);
  });

  it('leaves core alone', async () => {
    expect(await literals('packages/core/src/x.ts', "const s = '12px';\n")).toBe(0);
  });
});

describe('boundary selectors survive the literal rule', () => {
  it('still rejects a dynamic aircraft import in the web app', async () => {
    expect(await literals('apps/web/src/x.ts', "await import('@cpt/aircraft-demo');\n")).toBe(1);
  });

  it('still rejects a glob over aircraft packages in the web app', async () => {
    expect(
      await literals(
        'apps/web/src/x.ts',
        "import.meta.glob('../../../packages/aircraft-*/src/index.ts');\n",
      ),
    ).toBe(1);
  });

  it('reports a literal and a boundary breach in the same file separately', async () => {
    expect(
      await literals(
        'apps/web/src/x.ts',
        "const c = '#fff';\nawait import('@cpt/aircraft-demo');\n",
      ),
    ).toBe(2);
  });

  it.each([
    ['packages/panel-kit/src/x.ts', "await import('@cpt/aircraft-demo');\n"],
    ['packages/device-x/src/screen/x.ts', "await import('@cpt/aircraft-demo');\n"],
    ['packages/device-x/src/screen/x.ts', "await import('../../../aircraft-demo/src/index');\n"],
    ['packages/panel-kit/src/x.ts', "await import('../../aircraft-demo/src/index');\n"],
  ])('still rejects a dynamic cross-package import in %s', async (file, code) => {
    expect(await literals(file, code)).toBe(1);
  });

  it.each([
    ['packages/panel-kit/src/x.ts', "import '@cpt/aircraft-demo';\n"],
    ['packages/device-x/src/screen/x.ts', "import '@cpt/aircraft-demo';\n"],
    ['packages/device-x/src/screen/x.ts', "import '../../../aircraft-demo/src/index';\n"],
  ])('still rejects a static cross-package import in %s', async (file, code) => {
    expect(await eslintCount('no-restricted-imports', file, code)).toBe(1);
  });

  it('keeps panel-kit on @cpt/core and a device screen on @cpt/core and @cpt/panel-kit', async () => {
    const imports = 'no-restricted-imports';
    expect(await eslintCount(imports, 'packages/panel-kit/src/x.ts', "import '@cpt/core';\n")).toBe(
      0,
    );
    expect(
      await eslintCount(
        imports,
        'packages/device-x/src/screen/x.ts',
        "import '@cpt/panel-kit';\nimport '@cpt/core';\n",
      ),
    ).toBe(0);
  });

  it('reports a type literal and a boundary breach in the same screen file separately', async () => {
    expect(
      await literals(
        'packages/device-x/src/screen/x.ts',
        "const s = '12px';\nawait import('@cpt/aircraft-demo');\n",
      ),
    ).toBe(2);
  });

  it('still rejects a dynamic relative import into another package in the registries', async () => {
    expect(
      await literals(
        'apps/web/src/aircraft-registry.ts',
        "await import('../../../packages/aircraft-demo/src/index');\n",
      ),
    ).toBe(1);
  });
});

describe('literals in CSS', () => {
  const file = 'apps/web/src/x.css';

  it.each([
    ['color: #fff'],
    ['color: red'],
    ['color: rgb(0 0 0)'],
    ['color: oklch(60% 0.1 280)'],
    ['font-family: Arial'],
    ['font: 14px Arial'],
    ['outline-color: Highlight'],
    ['background-color: canvastext'],
    ['background: Window'],
    ['border: 1px solid Highlight'],
    ['padding: 12px'],
    ['margin-block: 1rem'],
    ['gap: 0.5em'],
    ['font-size: 14px'],
    ['line-height: 20px'],
    ['letter-spacing: 0.1em'],
  ])('rejects %s', async (declaration) => {
    expect(await cssWarnings(file, `a {\n  ${declaration};\n}\n`)).toBeGreaterThan(0);
  });

  it.each([
    ['color: var(--color-text)'],
    ['padding: var(--space-3)'],
    ['border-width: 1px'],
    ['font-family: var(--font-sans)'],
    ['font-family: inherit'],
    ['font: inherit'],
    ['font-weight: var(--weight-medium)'],
    ['border-color: var(--color-mark)'],
    ['width: 24px'],
    ['margin: 0'],
  ])('allows %s', async (declaration) => {
    expect(await cssWarnings(file, `a {\n  ${declaration};\n}\n`)).toBe(0);
  });

  it('ignores the tokens file', async () => {
    expect(
      await cssWarnings('apps/web/src/styles/tokens.css', ':root {\n  --color-bg: #fbfbfc;\n}\n'),
    ).toBe(0);
  });
});

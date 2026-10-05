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
    ["const c = '1px solid #fff';\n"],
    ['const c = `border: 1px solid #abc`;\n'],
    ["const c = 'rgb(0 0 0)';\n"],
    ["const c = 'oklch(60% 0.1 280)';\n"],
    ['const c = `hsl(${hue} 50% 50%)`;\n'],
  ])('rejects %s in the web app', async (code) => {
    expect(await literals(web, code)).toBe(1);
  });

  it('allows a token reference', async () => {
    expect(await literals(web, "const c = 'var(--color-accent)';\n")).toBe(0);
  });

  it('leaves panel-kit alone', async () => {
    expect(await literals('packages/panel-kit/src/x.tsx', "const c = '#6A57C4';\n")).toBe(0);
  });

  it('leaves aircraft packages alone', async () => {
    expect(await literals('packages/aircraft-demo/src/x.ts', "const c = 'rgb(0 0 0)';\n")).toBe(0);
  });

  it('applies in the registries too', async () => {
    expect(await literals('apps/web/src/aircraft-registry.ts', "const c = '#fff';\n")).toBe(1);
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

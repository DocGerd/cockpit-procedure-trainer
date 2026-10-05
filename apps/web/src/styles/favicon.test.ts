import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { afterAll, describe, expect, it } from 'vitest';

const webRoot = fileURLToPath(new URL('../../', import.meta.url));
const outDir = mkdtempSync(join(tmpdir(), 'cpt-favicon-'));
afterAll(() => rmSync(outDir, { recursive: true, force: true }));

const brand = readFileSync(new URL('../../../../docs/design/BRAND.md', import.meta.url), 'utf8');
const favicon = readFileSync(join(webRoot, 'public/favicon.svg'), 'utf8');

describe('favicon', () => {
  it('draws the BRAND.md delta mark in both accent values', () => {
    const paths = [...brand.matchAll(/^- `(M[^`]+)`$/gm)].map((match) => match[1]);
    expect(paths).toHaveLength(2);
    for (const path of paths) expect(favicon).toContain(`d="${path}"`);
    const accents = /^Violet: `(#[0-9A-F]+)` in the light theme, `(#[0-9A-F]+)` in the dark/m.exec(
      brand,
    );
    expect(accents).not.toBeNull();
    for (const accent of accents?.slice(1) ?? []) expect(favicon).toContain(`fill: ${accent}`);
  });

  it('is copied into dist and linked under the deploy base path', async () => {
    await build({ root: webRoot, base: '/trainer/uat/', logLevel: 'silent', build: { outDir } });
    expect(existsSync(join(outDir, 'favicon.svg'))).toBe(true);
    expect(readFileSync(join(outDir, 'index.html'), 'utf8')).toContain(
      'href="/trainer/uat/favicon.svg"',
    );
  }, 60_000);
});

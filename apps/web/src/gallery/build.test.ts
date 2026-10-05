import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { build } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const webRoot = resolve(import.meta.dirname, '../..');
const BUILD_TIMEOUT = 120_000;

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

describe('the gallery is a development-only entry', () => {
  let outDir = '';
  let files: string[] = [];

  beforeAll(async () => {
    outDir = await mkdtemp(join(tmpdir(), 'cpt-gallery-build-'));
    await build({
      root: webRoot,
      logLevel: 'silent',
      build: { outDir, emptyOutDir: true },
    });
    files = await listFiles(outDir);
  }, BUILD_TIMEOUT);

  afterAll(async () => {
    if (outDir) await rm(outDir, { recursive: true, force: true });
  });

  it('builds the app entry', () => {
    expect(files.some((file) => file.endsWith('index.html'))).toBe(true);
  });

  it('does not emit the gallery page', () => {
    expect(
      files.map((file) => relative(outDir, file)).filter((file) => /gallery/i.test(file)),
    ).toEqual([]);
  });

  it('does not bundle the gallery code', async () => {
    const scripts = files.filter((file) => file.endsWith('.js'));
    expect(scripts.length).toBeGreaterThan(0);
    for (const script of scripts) {
      expect(await readFile(script, 'utf8')).not.toContain('data-gallery-');
    }
  });
});

describe('the gallery page for the dev server', () => {
  it('is a root-level HTML entry that loads the gallery module', async () => {
    const html = await readFile(join(webRoot, 'gallery.html'), 'utf8');
    expect(html).toContain('src="/src/gallery/main.tsx"');
  });
});

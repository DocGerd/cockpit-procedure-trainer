import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { aircraftRegistry } from '../aircraft-registry';
import { pwaColors } from './config';
import { inlinedSvgMatcher } from './inlined-svg';

const webRoot = resolve(import.meta.dirname, '../..');
const BUILD_TIMEOUT = 120_000;

type Environment = { env: 'prod' | 'uat'; base: string; assetsInlineLimit?: number };
const environments: Environment[] = [
  { env: 'prod', base: '/cockpit-procedure-trainer/' },
  { env: 'uat', base: '/cockpit-procedure-trainer/uat/', assetsInlineLimit: 0 },
];

type Output = {
  dir: string;
  files: string[];
  worker: string;
  manifest: Record<string, unknown>;
  precache: string[];
};

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(directory, join(entry.parentPath, entry.name)));
}

async function buildFor({ env, base, assetsInlineLimit }: Environment): Promise<Output> {
  vi.stubEnv('BASE_PATH', base);
  vi.stubEnv('VITE_DEPLOY_ENV', env);
  const dir = await mkdtemp(join(tmpdir(), `cpt-pwa-${env}-`));
  try {
    await build({
      root: webRoot,
      logLevel: 'silent',
      build: {
        outDir: dir,
        emptyOutDir: true,
        ...(assetsInlineLimit === undefined ? {} : { assetsInlineLimit }),
      },
    });
  } finally {
    vi.unstubAllEnvs();
  }
  const worker = (await readFile(join(dir, 'sw.js'), 'utf8')).replace(/\s+/g, '');
  return {
    dir,
    files: await listFiles(dir),
    worker,
    manifest: JSON.parse(await readFile(join(dir, 'manifest.webmanifest'), 'utf8')),
    precache: [...worker.matchAll(/url"?:"([^"]+)","?revision/g)].map((match) => match[1] ?? ''),
  };
}

const imageUrls = (value: unknown, found = new Set<string>()): Set<string> => {
  if (typeof value === 'string') {
    if (value.startsWith('file:')) found.add(value);
  } else if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) imageUrls(child, found);
  }
  return found;
};

const outputs = new Map<string, Output>();

beforeAll(async () => {
  for (const environment of environments) outputs.set(environment.env, await buildFor(environment));
}, BUILD_TIMEOUT * environments.length);

afterAll(async () => {
  await Promise.all([...outputs.values()].map((output) => rm(output.dir, { recursive: true })));
});

describe.each(environments)('the $env build under $base', ({ env, base }) => {
  const output = () => outputs.get(env) as Output;

  it('scopes the manifest to its base path', () => {
    expect(output().manifest).toMatchObject({ start_url: base, scope: base, id: base });
  });

  it('prefixes the page assets with its base path', async () => {
    const html = await readFile(join(output().dir, 'index.html'), 'utf8');
    expect(html).toContain(`src="${base}assets/`);
    expect(html).toContain(`href="${base}manifest.webmanifest"`);
    expect(html).toContain(`href="${base}apple-touch-icon.png"`);
  });

  it('takes manifest and theme colours from tokens.css', async () => {
    const css = await readFile(join(webRoot, 'src/styles/tokens.css'), 'utf8');
    const light = pwaColors(css);
    expect(output().manifest).toMatchObject({
      theme_color: light.themeColor,
      background_color: light.backgroundColor,
    });
    const html = await readFile(join(output().dir, 'index.html'), 'utf8');
    expect(html).toContain(`content="${light.themeColor}" media="(prefers-color-scheme: light)"`);
    expect(html).toContain(
      `content="${pwaColors(css, 'dark').themeColor}" media="(prefers-color-scheme: dark)"`,
    );
  });

  it('declares every icon it lists and ships the file', () => {
    const icons = output().manifest.icons as { src: string; sizes: string; purpose: string }[];
    expect(icons.map((icon) => `${icon.sizes}/${icon.purpose}`).sort()).toEqual([
      '192x192/any',
      '512x512/any',
      '512x512/maskable',
    ]);
    for (const icon of icons) expect(output().precache).toContain(icon.src);
    expect(output().precache).toContain('apple-touch-icon.png');
    expect(output().precache).toContain('favicon.svg');
    expect(output().precache).toContain('manifest.webmanifest');
  });

  it('precaches the page, scripts, styles and every bundled font file', () => {
    const { files, precache } = output();
    expect(precache).toContain('index.html');
    const bundled = files.filter((file) => /\.(js|css|woff2)$/.test(file) && file !== 'sw.js');
    expect(bundled.filter((file) => file.endsWith('.woff2')).length).toBeGreaterThan(0);
    for (const file of bundled.filter((file) => !basename(file).startsWith('workbox-'))) {
      expect(precache).toContain(file);
    }
  });

  it('precaches every aircraft image, emitted or inlined into a precached script', async () => {
    const urls = [...imageUrls(aircraftRegistry)];
    expect(urls.length).toBeGreaterThan(0);
    const scripts = await Promise.all(
      output()
        .precache.filter((entry) => entry.endsWith('.js'))
        .map((entry) => readFile(join(output().dir, entry), 'utf8')),
    );
    const isInlined = inlinedSvgMatcher(scripts.join('\n'));

    for (const url of urls) {
      const path = fileURLToPath(url);
      const extension = extname(path);
      const stem = basename(path, extension);
      const emitted = output().precache.some(
        (entry) => entry.startsWith(`assets/${stem}-`) && entry.endsWith(extension),
      );
      const inlined = extension === '.svg' && isInlined(await readFile(path, 'utf8'));
      expect(emitted || inlined, path).toBe(true);
    }
  });

  it('uses its own cache id', () => {
    expect(output().worker).toContain(`setCacheNameDetails({prefix:"${env}"})`);
  });

  it('claims the page and falls back to the app shell', () => {
    expect(output().worker).toContain('clientsClaim()');
    expect(output().worker).toContain('createHandlerBoundToURL("index.html")');
  });

  it('waits for consent before taking over', () => {
    expect(output().worker.match(/skipWaiting\(\)/g)).toHaveLength(1);
    expect(output().worker).toMatch(/SKIP_WAITING.{0,20}skipWaiting\(\)/);
  });
});

describe('the two builds together', () => {
  it('use different cache ids and scopes', () => {
    const [prod, uat] = [outputs.get('prod') as Output, outputs.get('uat') as Output];
    expect(prod.worker).not.toBe(uat.worker);
    expect(prod.manifest.scope).not.toBe(uat.manifest.scope);
  });

  it('keep the production worker from deleting UAT caches', () => {
    const prod = outputs.get('prod') as Output;
    const uat = outputs.get('uat') as Output;
    expect(prod.worker).not.toContain('cleanupOutdatedCaches');
    expect(uat.worker).toContain('cleanupOutdatedCaches()');
  });

  it('keep the production worker from answering UAT page loads', () => {
    const prod = outputs.get('prod') as Output;
    const uat = outputs.get('uat') as Output;
    expect(prod.worker).toContain('denylist:[/^\\/cockpit-procedure-trainer\\/uat\\//]');
    expect(uat.worker).toContain('denylist:[]');
  });
});

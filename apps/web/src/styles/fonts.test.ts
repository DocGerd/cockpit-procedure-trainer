import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const webRoot = fileURLToPath(new URL('../../', import.meta.url));
const read = (path: string) => readFileSync(path, 'utf8');

const sources = (readdirSync(join(webRoot, 'src'), { recursive: true }) as string[])
  .filter((file) => /\.(tsx?|css|html)$/.test(file) && !/\.test\.tsx?$/.test(file))
  .map((file) => join(webRoot, 'src', file));

describe('fonts are bundled', () => {
  it('loads nothing from a font CDN', () => {
    for (const file of [join(webRoot, 'index.html'), ...sources]) {
      expect(read(file), file).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
    }
  });

  it('imports the Geist and Geist Mono weights from Fontsource', () => {
    const main = read(join(webRoot, 'src/main.tsx'));
    for (const weight of [400, 500, 600]) {
      expect(main).toContain(`'@fontsource/geist/${weight}.css'`);
    }
    for (const weight of [400, 500]) {
      expect(main).toContain(`'@fontsource/geist-mono/${weight}.css'`);
    }
  });
});

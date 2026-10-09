import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { latinFontFaces } from './font-subsets';

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

describe('latinFontFaces', () => {
  const fontsource = (family: string, weight: number) =>
    read(join(webRoot, `node_modules/@fontsource/${family}/${weight}.css`));
  const faces = (css: string) => [...css.matchAll(/\/\* ([\w-]+) \*\/\s*@font-face \{[^}]*\}/g)];

  it.each([
    ['geist', 400],
    ['geist', 600],
    ['geist-mono', 500],
  ])(
    'keeps only the latin-ext and latin faces of %s %i, unchanged and in order',
    (family, weight) => {
      const original = fontsource(family, weight);
      const kept = faces(latinFontFaces(original));
      expect(kept.map((face) => face[1])).toEqual([
        `${family}-latin-ext-${weight}-normal`,
        `${family}-latin-${weight}-normal`,
      ]);
      for (const face of kept) {
        expect(original).toContain(face[0]);
        expect(face[0]).toMatch(/unicode-range: U\+/);
      }
    },
  );

  it('refuses a stylesheet without a latin face', () => {
    expect(() => latinFontFaces('@font-face { font-family: X; }')).toThrow();
  });
});

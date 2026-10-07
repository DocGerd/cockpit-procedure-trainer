import { globSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(import.meta.dirname, '..');
const stylesheets = globSync('packages/device-*/src/**/*.css', { cwd: repoRoot }).sort();

const colourDeclaration = /(?:^|[\s;{}])(?:color|background|accent-color):\s*([^;}]+)/g;
const declaresColour = /(?<![\w-])(?:color|background|accent-color)\s*:/;

const tokens = readFileSync(resolve(repoRoot, 'apps/web/src/styles/tokens.css'), 'utf8');
const panelHex = (name: string): string => {
  const hex = new RegExp(`--${name}:\\s*#([0-9a-f]{6})`, 'i').exec(tokens)?.[1];
  if (hex === undefined) throw new Error(`tokens.css has no --${name}`);
  return hex;
};
const luminance = (hex: string): number => {
  const [r = 0, g = 0, b = 0] = [0, 2, 4].map((at) => {
    const channel = parseInt(hex.slice(at, at + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string): number => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05);
};
const MIN_TRACK_CONTRAST = 3;

// A stylesheet must style the range input when a screen next to it renders one.
const rendersRange = (stylesheet: string): boolean => {
  const dir = resolve(repoRoot, dirname(stylesheet));
  return globSync('*.tsx', { cwd: dir })
    .filter((file) => !file.includes('.test.'))
    .some((file) =>
      /type\s*=\s*(?:\{\s*)?["'`]range["'`]/.test(readFileSync(resolve(dir, file), 'utf8')),
    );
};

describe('device stylesheets', () => {
  it('finds the device stylesheets', () => {
    expect(stylesheets.length).toBeGreaterThan(0);
  });

  it('finds the device screens that render a range input', () => {
    expect(stylesheets.filter(rendersRange).length).toBeGreaterThan(0);
  });

  describe.each(stylesheets)('%s', (path) => {
    const css = readFileSync(resolve(repoRoot, path), 'utf8');

    it('styles a range input exactly when its screen renders one', () => {
      expect(css.includes("input[type='range']")).toBe(rendersRange(path));
    });

    it('takes every colour from a panel token and uses no brand or status token', () => {
      expect(css).not.toMatch(/--color-/);
      const colours = [...css.matchAll(colourDeclaration)];
      if (declaresColour.test(css)) expect(colours.length).toBeGreaterThan(0);
      for (const [, value = ''] of colours) {
        expect(value).toMatch(/var\(--panel-|transparent/);
      }
    });

    if (rendersRange(path)) {
      it('styles the volume slider in both engines', () => {
        expect(css).toMatch(/input\[type='range'\] \{[^}]*accent-color: var\(--panel-/);
        expect(css).toContain('::-webkit-slider-thumb {');
        expect(css).toContain('::-moz-range-thumb {');
        expect(css).toContain('::-webkit-slider-runnable-track {');
        expect(css).toContain('::-moz-range-track {');
      });

      it('draws the volume track so it stands out from the screen', () => {
        const tracks = [
          ...css.matchAll(/range-track\s*\{[^}]*background:\s*var\(--([\w-]+)\)/g),
          ...css.matchAll(/runnable-track\s*\{[^}]*background:\s*var\(--([\w-]+)\)/g),
        ];
        expect(tracks).toHaveLength(2);
        for (const [, token = ''] of tracks) {
          expect(contrast(panelHex(token), panelHex('panel-screen'))).toBeGreaterThanOrEqual(
            MIN_TRACK_CONTRAST,
          );
        }
      });
    }
  });
});

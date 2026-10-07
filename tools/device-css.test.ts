import { globSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(import.meta.dirname, '..');
const stylesheets = globSync('packages/device-*/src/**/*.css', { cwd: repoRoot }).sort();

const colourDeclaration = /(?:^|[\s;{}])(?:color|background|accent-color):\s*([^;}]+)/g;
const declaresColour = /(?<![\w-])(?:color|background|accent-color)\s*:/;

// A stylesheet must style the range input when a screen next to it renders one.
const rendersRange = (stylesheet: string): boolean => {
  const dir = resolve(repoRoot, dirname(stylesheet));
  return globSync('*.tsx', { cwd: dir })
    .filter((file) => !file.includes('.test.'))
    .some((file) => /type=["']range["']/.test(readFileSync(resolve(dir, file), 'utf8')));
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
    }
  });
});

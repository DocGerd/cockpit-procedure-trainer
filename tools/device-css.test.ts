import { globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(import.meta.dirname, '..');
const stylesheets = globSync('packages/device-*/src/**/*.css', { cwd: repoRoot }).sort();

describe('device stylesheets', () => {
  it('finds the device stylesheets', () => {
    expect(stylesheets.length).toBeGreaterThan(0);
  });

  describe.each(stylesheets)('%s', (path) => {
    const css = readFileSync(resolve(repoRoot, path), 'utf8');

    it('takes every colour from a panel token and uses no brand or status token', () => {
      expect(css).not.toMatch(/--color-/);
      const colours = [
        ...css.matchAll(/(?:^|[\s;{}])(?:color|background|accent-color):\s*([^;}]+)/g),
      ];
      for (const [, value = ''] of colours) {
        expect(value).toMatch(/var\(--panel-|transparent/);
      }
    });

    if (css.includes("input[type='range']")) {
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

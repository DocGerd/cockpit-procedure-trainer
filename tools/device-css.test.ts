import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const stylesheets = [
  ['ComScreen', 'packages/device-com/src/screen/ComScreen.css'],
  ['Sl40Screen', 'packages/device-sl40/src/screen/Sl40Screen.css'],
] as const;

describe.each(stylesheets)('%s stylesheet', (_name, path) => {
  const css = readFileSync(resolve(import.meta.dirname, '..', path), 'utf8');

  it('styles the volume slider in both engines', () => {
    expect(css).toMatch(/input\[type='range'\] \{[^}]*accent-color: var\(--panel-/);
    expect(css).toContain('::-webkit-slider-thumb {');
    expect(css).toContain('::-moz-range-thumb {');
    expect(css).toContain('::-webkit-slider-runnable-track {');
    expect(css).toContain('::-moz-range-track {');
  });

  it('takes every colour from a panel token and uses no brand or status token', () => {
    expect(css).not.toMatch(/--color-/);
    const colours = [
      ...css.matchAll(/(?:^|[\s;{}])(?:color|background|accent-color):\s*([^;}]+)/g),
    ];
    expect(colours.length).toBeGreaterThan(0);
    for (const [, value = ''] of colours) {
      expect(value).toMatch(/var\(--panel-|transparent/);
    }
  });
});

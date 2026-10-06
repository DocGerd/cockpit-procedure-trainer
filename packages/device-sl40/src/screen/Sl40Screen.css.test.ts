// @ts-expect-error the device packages declare no node types
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('Sl40Screen.css', import.meta.url), 'utf8');

describe('Sl40Screen stylesheet', () => {
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

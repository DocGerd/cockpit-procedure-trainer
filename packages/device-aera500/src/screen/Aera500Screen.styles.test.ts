// @ts-expect-error device-aera500 declares no node types
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css: string = readFileSync(new URL('Aera500Screen.css', import.meta.url), 'utf8');

describe('Aera500Screen stylesheet', () => {
  it('keeps the keys transparent at rest and shades a pressed one', () => {
    expect(css).toMatch(/\.cpt-device-aera500 button \{\s*background: transparent;\s*\}/);
    expect(css).toMatch(/\.cpt-device-aera500 button:active \{\s*background-color: [^;]+;\s*\}/);
  });

  it('lights the map screen evenly, without the glass depth shade', () => {
    expect(css).toMatch(
      /\.cpt-device-aera500 \.pk-glass::after \{\s*background-image: var\(--pk-glass-sheen\);\s*\}/,
    );
  });
});

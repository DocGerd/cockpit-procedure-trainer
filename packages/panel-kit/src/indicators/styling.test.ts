// @ts-expect-error panel-kit declares no node types; its manifest belongs to the scaffold
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('indicators.css', import.meta.url), 'utf8');

describe('readout blink', () => {
  it('switches the digits on and off at the panel blink period', () => {
    expect(css).toMatch(
      /\.pk-blink\s*\{[^}]*animation:[^;]*var\(--panel-blink-period\)[^;]*steps\(1/,
    );
    expect(css).toMatch(/@keyframes pk-blink\s*\{[^@]*opacity:\s*0/);
  });

  it('uses no brand or status token', () => {
    expect(css).not.toMatch(/--color-/);
  });
});

describe('readout blink under prefers-reduced-motion', () => {
  it('stops the blink and dims the digits instead', () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.pk-blink\s*\{\s*animation:\s*none;\s*opacity:\s*0\.5;/,
    );
  });
});

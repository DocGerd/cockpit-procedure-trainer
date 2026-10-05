// @ts-expect-error panel-kit declares no node types; its manifest belongs to the scaffold
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('controls.css', import.meta.url), 'utf8');

describe('motion', () => {
  it('transitions transform on moving parts', () => {
    expect(css).toMatch(/\.pk-move\s*\{[^}]*transition:[^;]*transform/);
  });

  it('turns the transition off under prefers-reduced-motion', () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.pk-move\s*\{\s*transition:\s*none;/,
    );
  });
});

describe('panel styling', () => {
  it('draws its own focus ring from the panel focus token', () => {
    expect(css).toMatch(/:focus-visible[^{]*\{[^}]*outline:[^;]*var\(--panel-focus\)/);
  });

  it('uses no brand or status token', () => {
    expect(css).not.toMatch(/--color-/);
  });

  it('takes every colour from a panel token', () => {
    const colours = [...css.matchAll(/^\s*(?:fill|stroke|color|background|outline):\s*([^;]+);/gm)];
    expect(colours.length).toBeGreaterThan(0);
    for (const [, value = ''] of colours) {
      expect(value).toMatch(/var\(--panel-|none|transparent|inherit/);
    }
  });
});

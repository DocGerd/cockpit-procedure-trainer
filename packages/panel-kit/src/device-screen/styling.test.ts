// @ts-expect-error panel-kit declares no node types; its manifest belongs to the scaffold
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('device-screen.css', import.meta.url), 'utf8');

describe('panel styling', () => {
  it('uses no brand or status token', () => {
    expect(css).not.toMatch(/--color-/);
  });

  it('takes every colour from a panel token', () => {
    const colours = [...css.matchAll(/^\s*(?:border|color|background):\s*([^;]+);/gm)];
    expect(colours.length).toBeGreaterThan(0);
    for (const [, value = ''] of colours) {
      expect(value).toMatch(/var\(--panel-/);
    }
  });

  it('keeps the off scrim from taking pointer input', () => {
    expect(css).toMatch(/\.pk-device-off\s*\{[^}]*pointer-events:\s*none/);
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDurationMs } from '../theme';

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8');

const tokens = read('./tokens.css');
const fade = read('./theme-fade.css');

const colourTokens = (css: string) =>
  [...css.matchAll(/(--color-[a-z-]+):/g)].map(([, name]) => name);

describe('the theme cross-fade', () => {
  it('registers every colour token', () => {
    const registered = [...fade.matchAll(/@property (--color-[a-z-]+)/g)].map(([, name]) => name);
    expect(registered.length).toBeGreaterThan(0);
    expect(new Set(registered)).toEqual(new Set(colourTokens(tokens)));
  });

  it('transitions every registered token and no others', () => {
    const registered = [...fade.matchAll(/@property (--color-[a-z-]+)/g)].map(([, name]) => name);
    const listed = /transition-property:([^;]+);/.exec(fade)?.[1]?.match(/--color-[a-z-]+/g);
    expect(listed).toEqual(registered);
  });

  it('reads a fade duration from the token', () => {
    const value = /--duration-theme:([^;]+);/.exec(tokens)?.[1] ?? '';
    expect(parseDurationMs(value)).toBeGreaterThan(0);
  });

  it('keeps the panel surface out of the transition reset', () => {
    const outside = fade.replace(/@media[^{]*\{[\s\S]*$/, '');
    const rules = [...outside.matchAll(/([^{}]*)\{([^}]*)\}/g)].filter(([, , body = '']) =>
      /transition:\s*none/.test(body),
    );
    expect(rules.length).toBeGreaterThan(0);
    for (const [, selector = ''] of rules) {
      for (const part of selector.split(/,(?![^(]*\))/)) {
        expect(part.trim()).toMatch(/:not\(\[data-panel-surface\], \[data-panel-surface\] \*\)/);
      }
    }
  });
});

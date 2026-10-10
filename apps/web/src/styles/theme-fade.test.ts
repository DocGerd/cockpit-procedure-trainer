import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

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
});

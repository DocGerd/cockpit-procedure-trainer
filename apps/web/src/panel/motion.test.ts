import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const files = (dir: URL, extensions: readonly string[]): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules') return [];
    const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
    if (entry.isDirectory()) return files(child, extensions);
    return extensions.some((extension) => entry.name.endsWith(extension)) ? [child.pathname] : [];
  });

const roots = [new URL('../', import.meta.url), new URL('../../../../packages/', import.meta.url)];
const sources = (extensions: readonly string[]) =>
  roots.flatMap((root) => files(root, extensions)).filter((path) => !/\.test\.tsx?$/.test(path));

type Family = 'transition' | 'animation';
type Rule = { selector: string; declarations: [property: string, value: string][] };

const REDUCED = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/g;

/** Splits a stylesheet into the rules outside and inside `prefers-reduced-motion: reduce` blocks. */
function split(css: string): { outside: string; reduced: string } {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let outside = '';
  let reduced = '';
  let from = 0;
  for (const match of source.matchAll(REDUCED)) {
    const start = match.index;
    let index = start + match[0].length;
    let depth = 1;
    while (depth > 0 && index < source.length) {
      if (source[index] === '{') depth += 1;
      if (source[index] === '}') depth -= 1;
      index += 1;
    }
    outside += source.slice(from, start);
    reduced += source.slice(start + match[0].length, index - 1);
    from = index;
  }
  return { outside: outside + source.slice(from), reduced };
}

const rules = (css: string): Rule[] =>
  [...css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)].map(([, selector = '', body = '']) => ({
    selector: selector.trim().replace(/\s+/g, ' '),
    declarations: body
      .split(';')
      .map((declaration) => declaration.split(':').map((part) => part.trim()))
      .filter((parts): parts is [string, string] => parts.length === 2 && parts[0] !== '')
      .map(([property, value]) => [property, value]),
  }));

const familyOf = (property: string): Family | undefined =>
  /^transition(-|$)/.test(property)
    ? 'transition'
    : /^animation(-|$)/.test(property)
      ? 'animation'
      : undefined;

const still = (property: string, value: string) =>
  /^none$/.test(value) || (/-duration$/.test(property) && /^0m?s$/.test(value));

const stops = (rule: Rule, family: Family) =>
  rule.declarations.some(
    ([property, value]) =>
      (property === family ||
        property === `${family}-property` ||
        property === `${family}-name` ||
        property === `${family}-duration`) &&
      still(property, value),
  );

/** Every rule and motion family that moves without a reduced-motion rule stopping that same family. */
function unguardedMotion(css: string): string[] {
  const { outside, reduced } = split(css);
  const guards = rules(reduced);
  return rules(outside).flatMap((rule) => {
    const families = new Set(
      rule.declarations
        .filter(([property, value]) => familyOf(property) && !still(property, value))
        .map(([property]) => familyOf(property) as Family),
    );
    return [...families]
      .filter(
        (family) =>
          !guards.some((guard) => guard.selector === rule.selector && stops(guard, family)),
      )
      .map((family) => `${rule.selector} (${family})`);
  });
}

describe('the reduced-motion check', () => {
  const wrap = (body: string) => `@media (prefers-reduced-motion: reduce) { ${body} }`;

  it('accepts a guard on the same property', () => {
    expect(
      unguardedMotion(`.a { transition: transform 1s; } ${wrap('.a { transition: none; }')}`),
    ).toEqual([]);
    expect(
      unguardedMotion(`.a { animation: spin 1s; } ${wrap('.a { animation: none; }')}`),
    ).toEqual([]);
  });

  it('rejects a guard on the other property', () => {
    expect(
      unguardedMotion(`.a { transition: transform 1s; } ${wrap('.a { animation: none; }')}`),
    ).toEqual(['.a (transition)']);
    expect(
      unguardedMotion(`.a { animation: spin 1s; } ${wrap('.a { transition: none; }')}`),
    ).toEqual(['.a (animation)']);
  });

  it('rejects a guard on another selector and a missing guard', () => {
    expect(
      unguardedMotion(`.a { transition: transform 1s; } ${wrap('.b { transition: none; }')}`),
    ).toEqual(['.a (transition)']);
    expect(unguardedMotion('.a { animation: spin 1s; }')).toEqual(['.a (animation)']);
  });

  it('sees longhands and accepts a longhand guard', () => {
    expect(unguardedMotion('.a { transition-duration: 200ms; }')).toEqual(['.a (transition)']);
    expect(unguardedMotion('.a { animation-name: spin; }')).toEqual(['.a (animation)']);
    expect(
      unguardedMotion(`.a { animation-name: spin; } ${wrap('.a { animation-name: none; }')}`),
    ).toEqual([]);
    expect(
      unguardedMotion(
        `.a { transition-property: transform; } ${wrap('.a { transition-duration: 0s; }')}`,
      ),
    ).toEqual([]);
  });

  it('ignores rules that do not move and checks every reduced-motion block', () => {
    expect(unguardedMotion('.a { transition: none; animation-duration: 0s; }')).toEqual([]);
    expect(
      unguardedMotion(
        `.a { transition: transform 1s; } .b { animation: spin 1s; } ${wrap('.a { transition: none; }')} ${wrap('.b { animation: none; }')}`,
      ),
    ).toEqual([]);
  });
});

describe('reduced motion', () => {
  it('stops every transition and animation on the panel and in the app', () => {
    const sheets = sources(['.css']);
    expect(sheets.length).toBeGreaterThan(0);
    const unguarded = sheets.flatMap((path) =>
      unguardedMotion(readFileSync(path, 'utf8')).map((entry) => `${path}: ${entry}`),
    );
    expect(unguarded).toEqual([]);
  });

  it('draws no motion from scripts, where the media query cannot reach it', () => {
    const offenders = sources(['.tsx', '.ts']).filter((path) =>
      /<animate|\btransition:|\banimation:|\.animate\(/.test(readFileSync(path, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});

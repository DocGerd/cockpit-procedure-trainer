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

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** The body of each `@media (prefers-reduced-motion: reduce)` block. */
function reducedBlocks(css: string): string[] {
  const blocks: string[] = [];
  for (const match of css.matchAll(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/g)) {
    let depth = 1;
    let index = (match.index ?? 0) + match[0].length;
    const start = index;
    while (depth > 0 && index < css.length) {
      if (css[index] === '{') depth += 1;
      if (css[index] === '}') depth -= 1;
      index += 1;
    }
    blocks.push(css.slice(start, index - 1));
  }
  return blocks;
}

const moving = (css: string) =>
  [...css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)]
    .filter(([, , body = '']) => /(?:^|;|\s)(transition|animation)\s*:\s*(?!none)/.test(body))
    .map(([, selector = '']) => selector.trim());

describe('reduced motion', () => {
  it('stops every transition and animation on the panel and in the app', () => {
    const sheets = sources(['.css']);
    expect(sheets.length).toBeGreaterThan(0);
    const unguarded = sheets.flatMap((path) => {
      const css = stripComments(readFileSync(path, 'utf8'));
      const reduced = reducedBlocks(css).join('\n');
      return moving(css.replace(reduced, ''))
        .filter((selector) => {
          const guard = new RegExp(
            `${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{[^}]*(transition|animation)\\s*:\\s*none`,
          );
          return !guard.test(reduced);
        })
        .map((selector) => `${path}: ${selector}`);
    });
    expect(unguarded).toEqual([]);
  });

  it('draws no motion from scripts, where the media query cannot reach it', () => {
    const offenders = sources(['.tsx', '.ts']).filter((path) =>
      /<animate|\btransition:|\banimation:|\.animate\(/.test(readFileSync(path, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});

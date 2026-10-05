import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const base = readFileSync(new URL('./base.css', import.meta.url), 'utf8');

function declarations(selector: RegExp): string {
  const found = selector.exec(base);
  if (!found) return '';
  const open = found.index + found[0].length;
  return base.slice(open, base.indexOf('}', open));
}

describe('color-scheme follows the theme', () => {
  it('is light on :root', () => {
    expect(declarations(/:root\s*\{/)).toMatch(/color-scheme:\s*light\s*;/);
  });

  it('is dark on the dark theme', () => {
    expect(declarations(/\[data-theme=["']dark["']\]\s*\{/)).toMatch(/color-scheme:\s*dark\s*;/);
  });
});

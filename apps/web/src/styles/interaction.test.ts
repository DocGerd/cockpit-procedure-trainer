import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const base = readFileSync(new URL('./base.css', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

function rules(selector: RegExp): string[] {
  return [...base.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectors = '']) => selector.test(selectors))
    .map(([, , body = '']) => body);
}

describe('pointer feedback', () => {
  it('gives the primary button the strong accent on hover', () => {
    expect(rules(/\.button-primary[^,{]*:hover/).join()).toMatch(
      /background(-color)?:\s*var\(--color-accent-strong\)/,
    );
  });

  it.each(['chrome-button', 'button-secondary'])('gives .%s the mist fill on hover', (name) => {
    expect(rules(new RegExp(`\\.${name}[^,{]*:hover`)).join()).toMatch(
      /background(-color)?:\s*var\(--color-surface-muted\)/,
    );
  });

  it('keeps hover below pressed and selected states', () => {
    for (const [, selectors = ''] of base.matchAll(/([^{}]+)\{/g)) {
      for (const selector of selectors.split(',')) {
        if (/:(hover|active)/.test(selector)) expect(selector.trim()).toMatch(/^:where\(/);
      }
    }
  });
});

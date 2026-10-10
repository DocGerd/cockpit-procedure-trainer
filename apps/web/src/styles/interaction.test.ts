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

  it('gives .chrome-button the mist fill on hover', () => {
    expect(rules(/\.chrome-button[^,{]*:hover/).join()).toMatch(
      /background(-color)?:\s*var\(--color-surface-muted\)/,
    );
  });

  it('rests the secondary button on the mist fill in ink, and darkens it to the hairline on hover', () => {
    const rest = rules(/^\s*\.button-secondary\s*$/).join();
    expect(rest).toMatch(/color:\s*var\(--color-text\)/);
    expect(rest).toMatch(/background:\s*var\(--color-surface-muted\)/);
    expect(rest).not.toMatch(/accent/);
    expect(rules(/\.button-secondary[^,{]*:hover/).join()).toMatch(
      /background(-color)?:\s*var\(--color-border\)/,
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

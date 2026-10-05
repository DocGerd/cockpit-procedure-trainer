import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const base = readFileSync(new URL('./base.css', import.meta.url), 'utf8');

it('keeps the accent focus ring off the panel surface', () => {
  const rules = [...base.matchAll(/([^{}]*:focus-visible[^{}]*)\{([^}]*)\}/g)];
  expect(rules.length).toBeGreaterThan(0);
  for (const [, selector = '', body = ''] of rules) {
    if (body.includes('--color-accent')) {
      expect(selector.trim()).toMatch(/:not\(\[data-panel-surface\] \*\)/);
    }
  }
  expect(rules.some(([, , body = '']) => body.includes('--color-accent'))).toBe(true);
});

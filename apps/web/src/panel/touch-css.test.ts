import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const panel = read('./panel.css');

const rules = (css: string) =>
  [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
    ([, selector = '', body = '']) => ({
      selector: selector.trim(),
      body,
    }),
  );

const rule = (selector: string) => rules(panel).find((entry) => entry.selector === selector);

describe('panel stylesheet', () => {
  it('stops the browser from taking the panel gestures itself', () => {
    expect(rule('.panel-stage')?.body).toMatch(/touch-action:\s*none/);
  });

  it('turns off text selection and the touch callout on the panel', () => {
    const body = rule('.panel-stage')?.body;
    expect(body).toMatch(/(?<!-webkit-)user-select:\s*none/);
    expect(body).toMatch(/-webkit-user-select:\s*none/);
    expect(body).toMatch(/-webkit-touch-callout:\s*none/);
  });

  it('centres a placement on its rect, so a control smaller than the touch target grows around it', () => {
    const body = rule('.panel-placement')?.body;
    expect(body).toMatch(/align-items:\s*center/);
    expect(body).toMatch(/justify-content:\s*center/);
  });

  it('clips the zoomed panel without making the stage scrollable', () => {
    const body = rule('.panel-stage[data-zoomed]')?.body;
    expect(body).toMatch(/overflow:\s*clip/);
    expect(body).not.toMatch(/overflow:\s*(hidden|auto|scroll)/);
  });

  it('only draws the zoom transform while zoomed', () => {
    expect(rule('.panel-zoom')?.body).not.toMatch(/transform:/);
    expect(rule('.panel-zoom[data-zoomed]')?.body).toMatch(/transform:/);
  });
});

describe('the rest of the app', () => {
  it('leaves touch-action alone outside the panel stage', () => {
    const sheets = (dir: URL): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
        if (entry.isDirectory()) return sheets(child);
        return entry.name.endsWith('.css') ? [child.pathname] : [];
      });
    const offenders = sheets(new URL('..', import.meta.url)).flatMap((path) =>
      rules(readFileSync(path, 'utf8'))
        .filter(({ body }) => body.includes('touch-action'))
        .map(({ selector }) => selector),
    );
    expect(offenders).toEqual(['.panel-stage']);
  });
});

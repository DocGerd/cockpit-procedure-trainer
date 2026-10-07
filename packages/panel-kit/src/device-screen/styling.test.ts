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

  it('centres the screen at its natural size and scales it from the custom property', () => {
    expect(css).toMatch(/\.pk-device-content\s*\{[^}]*width:\s*max-content/);
    expect(css).toMatch(
      /\.pk-device-content\s*\{[^}]*transform:\s*translate\(-50%,\s*-50%\)\s*scale\(var\(--pk-device-scale/,
    );
  });

  it('keeps the off scrim visible', () => {
    const opacity = /\.pk-device-off\s*\{[^}]*opacity:\s*([\d.]+)/.exec(css)?.[1];
    expect(Number(opacity)).toBeGreaterThan(0);
  });
});

const rule = (selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const body = new RegExp(`(?:^|[},]\\s*)${escaped}\\s*(?:,[^{]*)?\\{([^}]*)\\}`, 'm').exec(
    css,
  )?.[1];
  if (body === undefined) throw new Error(`no rule for ${selector}`);
  return body;
};

describe('device hardware', () => {
  it('draws without filters, which cost a re-raster', () => {
    expect(css).not.toMatch(/(?<![\w-])(?:backdrop-)?filter\s*:/);
  });

  it.each(['.pk-device', '.pk-mirror-bezel'])(
    '%s keeps its border and padding, so the screen keeps its room',
    (selector) => {
      const body = rule(selector);
      expect(body).toMatch(/padding:\s*var\(--space-2\);/);
      expect(body).toMatch(/border:\s*var\(--space-1\) solid var\(--panel-/);
    },
  );

  it.each(['.pk-device', '.pk-mirror-bezel'])(
    '%s lights its chamfer from the upper left',
    (selector) => {
      const colours = /border-color:\s*([^;]+);/.exec(rule(selector))?.[1]?.split(/\s+/);
      expect(colours).toEqual([
        'var(--panel-metal-light)',
        'var(--panel-bezel-dark)',
        'var(--panel-metal-shade)',
        'var(--panel-bezel)',
      ]);
    },
  );

  it.each([
    '.pk-mirror-screen::after',
    '.pk-device-screen::after',
    '.pk-device-content > * > :first-child::after',
  ])('lays %s over the display without taking pointer input', (selector) => {
    const body = rule(selector);
    expect(body).toMatch(/position:\s*absolute/);
    expect(body).toMatch(/pointer-events:\s*none/);
  });

  it.each(['.pk-device', '.pk-mirror-bezel'])('%s casts its own shadow', (selector) => {
    expect(rule(selector)).toMatch(/box-shadow:\s*var\(--pk-cast\)/);
  });

  it('lets the mirror bezel shadow fall past the slot edge, and clips beyond it', () => {
    const slot = rule('.pk-mirror');
    expect(slot).not.toMatch(/box-shadow/);
    expect(slot).toMatch(/overflow:\s*clip;/);
    expect(slot).toMatch(/overflow-clip-margin:\s*var\(--space-/);
  });

  it('puts glare on the glass over a display, never over the keys', () => {
    expect(rule('.pk-mirror-screen::after')).toMatch(/var\(--pk-glass\)/);
    expect(rule('.pk-device-content > * > :first-child::after')).toMatch(/var\(--pk-glass\)/);
    expect(rule('.pk-device-screen::after')).not.toMatch(/--pk-glass/);
  });

  it('paints keycaps between the key face and its legend, outside the hit region', () => {
    const key = rule('.pk-device-content button');
    expect(key).toMatch(/position:\s*relative/);
    expect(key).toMatch(/isolation:\s*isolate/);
    for (const part of ['.pk-device-content button::before', '.pk-device-content button::after']) {
      const body = rule(part);
      expect(body).toMatch(/z-index:\s*-\d/);
      expect(body).toMatch(/pointer-events:\s*none/);
    }
  });
});

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
    '.pk-glass::after',
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
    expect(slot).toMatch(/overflow-clip-margin:\s*(?:calc\()?var\(--space-/);
  });

  it('puts glare on the glass over a display, never over the keys', () => {
    expect(rule('.pk-mirror-screen::after')).toMatch(/var\(--pk-glass\)/);
    expect(rule('.pk-device-content > * > :first-child::after')).toMatch(/var\(--pk-glass\)/);
    expect(rule('.pk-device-screen::after')).not.toMatch(/--pk-glass/);
    expect(rule('.pk-glass::after')).toMatch(/background-image:\s*var\(--pk-glass\);/);
  });

  it('keeps the glare faint enough for the screen to read through', () => {
    const glareShares = (source: string): number[] =>
      [...source.matchAll(/var\(--panel-glare\)\s+(\d+)%/g)].map(([, share = '']) => Number(share));
    const glass = /--pk-glass:([^;]*);/.exec(css)?.[1] ?? '';
    const glassShares = glareShares(glass);
    expect(glassShares.length).toBeGreaterThan(0);
    expect(Math.max(...glassShares)).toBeLessThanOrEqual(18);

    const bandShares = glareShares(rule('.pk-device-content > * > :first-child::after'));
    expect(bandShares.length).toBeGreaterThan(0);
    expect(Math.max(...bandShares)).toBeLessThanOrEqual(6);

    // A face's own window takes the same glass and adds no glare of its own.
    expect(glareShares(rule('.pk-glass::after'))).toEqual([]);
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

describe('a device that draws its own face', () => {
  const OWN_DEVICE = ".pk-device[data-face='own']";
  const OWN_MIRROR = ".pk-mirror[data-face='own']";

  it('sits on a borderless brushed light-metal plate, without screws or a cast shadow', () => {
    const plate = rule(OWN_DEVICE);
    expect(plate).toMatch(/border-width:\s*0;/);
    expect(plate).toMatch(/box-shadow:\s*none;/);
    expect(plate).toMatch(/background-color:\s*var\(--panel-metal-light\);/);
    expect(plate).toMatch(/background-image:\s*var\(--pk-brush\);/);
    expect(rule(`${OWN_DEVICE}::before`)).toMatch(/content:\s*none;/);
  });

  it('keeps the brushed stripes of the faceplate', () => {
    const faceplate = /--pk-faceplate:([^;]*);/.exec(css)?.[1] ?? '';
    expect(faceplate.trim().startsWith('var(--pk-brush)')).toBe(true);
    expect(/--pk-brush:([^;]*);/.exec(css)?.[1]).toMatch(/repeating-linear-gradient/);
  });

  it('has no faceplate recess around its box', () => {
    const box = rule(`${OWN_DEVICE} .pk-device-screen`);
    expect(box).toMatch(/background-color:\s*transparent;/);
    expect(box).toMatch(/background-image:\s*none;/);
    expect(rule(`${OWN_DEVICE} .pk-device-screen::after`)).toMatch(/content:\s*none;/);
  });

  it('scales its face like a framed screen, out of reach of the lip, glass and keycaps', () => {
    const content = rule('.pk-face-content');
    expect(content).toMatch(/width:\s*max-content/);
    expect(content).toMatch(
      /transform:\s*translate\(-50%,\s*-50%\)\s*scale\(var\(--pk-device-scale/,
    );
    expect(css).not.toMatch(/\.pk-face-content[^{,]*(?:button|:first-child|>)/);
  });

  it('draws the mirror without bezel, screws or label column', () => {
    const bezel = rule(`${OWN_MIRROR} .pk-mirror-bezel`);
    expect(bezel).toMatch(/display:\s*block;/);
    expect(bezel).toMatch(/border-width:\s*0;/);
    expect(bezel).toMatch(/padding:\s*0;/);
    expect(bezel).toMatch(/box-shadow:\s*none;/);
    expect(bezel).toMatch(/background-color:\s*transparent;/);
    expect(bezel).toMatch(/background-image:\s*none;/);
    expect(rule(`${OWN_MIRROR} .pk-mirror-bezel::before`)).toMatch(/content:\s*none;/);
  });

  it('places the mirror label on the face in the legend colour, at its framed size', () => {
    const label = rule(`${OWN_MIRROR} .pk-mirror-label`);
    expect(label).toMatch(/position:\s*absolute;/);
    expect(label).toMatch(/color:\s*var\(--panel-legend\);/);
    expect(label).not.toMatch(/font-size/);
    expect(rule('.pk-mirror-label')).toMatch(/font-size:\s*var\(--text-2xl\);/);
  });

  it('stacks a vertical label upright, letter over letter', () => {
    const vertical = rule('.pk-mirror-label[data-vertical]');
    expect(vertical).toMatch(/writing-mode:\s*vertical-lr;/);
    expect(vertical).toMatch(/text-orientation:\s*upright;/);
  });
});

describe('face keys and knob helpers', () => {
  it.each(['.pk-face-key', '.pk-knob-helper'])(
    '%s draws no keycap and rings focus in the panel colour',
    (selector) => {
      const body = rule(selector);
      expect(body).toMatch(/background-color:\s*transparent;/);
      expect(body).not.toMatch(/gradient|box-shadow/);
      expect(rule(`${selector}:focus-visible`)).toMatch(
        /outline:\s*2px solid var\(--panel-focus\);/,
      );
    },
  );

  it('outlines a knob helper flat, with a hairline', () => {
    expect(rule('.pk-knob-helper')).toMatch(/border:\s*1px solid var\(--panel-/);
  });

  it('keeps the face key without a border, so its hit box is all there is', () => {
    expect(rule('.pk-face-key')).toMatch(/border-width:\s*0;/);
  });
});

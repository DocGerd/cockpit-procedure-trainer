import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8');
const checklistCss = read('./checklist.css').replace(/\/\*[\s\S]*?\*\//g, '');
const tokensCss = read('../styles/tokens.css');

const declarations = (block: string) =>
  new Map(
    [...block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map(([, name = '', value = '']) => [
      name,
      value.trim(),
    ]),
  );
const blockOf = (css: string, selector: RegExp) => css.match(selector)?.[1] ?? '';
const root = declarations(blockOf(tokensCss, /:root\s*\{([^}]*)\}/));
const dark = declarations(blockOf(tokensCss, /\[data-theme='dark'\]\s*\{([^}]*)\}/));
const themes = { light: root, dark: new Map([...root, ...dark]) };

const ruleBody = (selector: string) =>
  [...checklistCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(
    ([, found = '']) => found.trim() === selector,
  )?.[2] ?? '';

type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
const mix = (a: Rgb, b: Rgb, share: number): Rgb =>
  a.map((channel, i) => channel * share + (b[i] ?? 0) * (1 - share)) as Rgb;
const luminance = (colour: Rgb) => {
  const [r = 0, g = 0, b = 0] = colour.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: Rgb, b: Rgb) => {
  const [hi = 0, lo = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const tokenIn = (body: string, property: string) =>
  body.match(new RegExp(`(?:^|;|\\s)${property}:\\s*var\\((--[a-z0-9-]+)\\)`))?.[1];

describe('the Guided deviation banner', () => {
  const banner = ruleBody('.checklist-banner');
  const tint = banner.match(
    /background:\s*color-mix\(in srgb, var\((--[a-z0-9-]+)\) (\d+)%, (?:transparent|var\(--color-surface\))\)/,
  );

  it('tints the pane surface with a share of one token', () => {
    expect(tint).not.toBeNull();
  });

  for (const [theme, tokens] of Object.entries(themes)) {
    it(`keeps its eyebrow and body text at AA contrast on the tint in ${theme}`, () => {
      const [, tintToken = '', share = '0'] = tint ?? [];
      const surface = rgb(tokens.get('--color-surface') ?? '');
      const ground = mix(rgb(tokens.get(tintToken) ?? ''), surface, Number(share) / 100);
      const inks = [
        tokenIn(ruleBody('.checklist-banner .checklist-eyebrow'), 'color'),
        tokenIn(banner, 'color') ?? '--color-text',
      ];
      for (const ink of inks) {
        expect(ink).toBeDefined();
        expect(contrast(rgb(tokens.get(ink ?? '') ?? ''), ground)).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

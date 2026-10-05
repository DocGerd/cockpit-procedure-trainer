import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8');

type Tokens = Map<string, string>;

const normalise = (value: string) => value.replace(/#[0-9a-fA-F]+/g, (hex) => hex.toLowerCase());

const brand = (() => {
  const light: Tokens = new Map();
  const dark: Tokens = new Map();
  const row = /^\|\s*`(--[a-z0-9-]+)`\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|/;
  for (const line of read('../../../../docs/design/BRAND.md').split('\n')) {
    const match = row.exec(line);
    if (match?.[1] && match[2] && match[3]) {
      light.set(match[1], normalise(match[2]));
      dark.set(match[1], normalise(match[3]));
    }
  }
  return { light, dark };
})();

const css = read('./tokens.css');

function block(selector: RegExp): Tokens {
  const found = selector.exec(css);
  if (!found) return new Map();
  const open = found.index + found[0].length;
  const body = css.slice(open, css.indexOf('}', open));
  const tokens: Tokens = new Map();
  for (const match of body.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) {
    if (match[1] && match[2]) tokens.set(match[1], normalise(match[2].trim()));
  }
  return tokens;
}

const root = block(/:root\s*\{/);
const darkBlock = block(/\[data-theme=["']dark["']\]\s*\{/);

const themes: Record<string, Tokens> = {
  light: root,
  dark: new Map([...root, ...darkBlock]),
};

describe('tokens.css matches BRAND.md', () => {
  it('reads every token row from BRAND.md', () => {
    expect(brand.light.size).toBeGreaterThan(0);
  });

  it('defines every BRAND.md token in :root with its light value', () => {
    for (const [name, value] of brand.light) {
      expect(root.get(name), name).toBe(value);
    }
  });

  it('overrides in the dark block exactly the tokens whose dark value differs', () => {
    for (const [name, value] of brand.dark) {
      if (value === brand.light.get(name)) {
        expect(darkBlock.has(name), `${name} is not repeated in the dark block`).toBe(false);
      } else {
        expect(darkBlock.get(name), name).toBe(value);
      }
    }
  });

  it('defines no token absent from BRAND.md', () => {
    for (const name of [...root.keys(), ...darkBlock.keys()]) {
      expect(brand.light.has(name), name).toBe(true);
    }
  });

  it('declares custom properties only', () => {
    const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const declaration of body.matchAll(/^\s*([a-z0-9-]+)\s*:[^;{]*;/gm)) {
      expect(declaration[1]?.startsWith('--'), declaration[0]).toBe(true);
    }
  });
});

function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi = 0, lo = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const grounds = ['--color-bg', '--color-surface'];
const pairs: [foreground: string, background: string][] = [
  ...['--color-text', '--color-text-secondary', '--color-text-muted'].flatMap((ink) =>
    grounds.map((ground): [string, string] => [ink, ground]),
  ),
  ...['--color-success', '--color-warning', '--color-danger'].flatMap((ink) =>
    grounds.map((ground): [string, string] => [ink, ground]),
  ),
  ['--color-accent', '--color-surface'],
  ['--color-on-accent', '--color-accent'],
];

describe('WCAG AA contrast', () => {
  for (const [name, tokens] of Object.entries(themes)) {
    for (const [foreground, background] of pairs) {
      it(`${name}: ${foreground} on ${background}`, () => {
        const fg = tokens.get(foreground);
        const bg = tokens.get(background);
        expect(fg).toBeDefined();
        expect(bg).toBeDefined();
        expect(contrast(fg ?? '', bg ?? '')).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

// Bare hex: the colour-literal lint rule is for UI code, and this is the reference data.
const bundle: Record<string, [light: string, dark?: string | false]> = {
  '--color-bg': ['fbfbfc', '0d0e10'],
  '--color-surface': ['ffffff', '15171a'],
  '--color-surface-subtle': ['f4f5f7', '141619'],
  '--color-surface-muted': ['eef0f2', '1b1e22'],
  '--color-divider': ['e6e9ec', '202428'],
  '--color-border': ['dce0e4', '2a2e33'],
  '--color-text': ['14161a', 'eceef1'],
  '--color-text-secondary': ['3b4046', 'c2c7cd'],
  '--color-text-muted': ['5e646b', '969ca4'],
  '--color-accent': ['6a57c4', false],
  '--color-success': ['2e7d46', '5fbe7c'],
  '--color-warning': ['9a6b1a', 'd6a23e'],
  '--color-danger': ['bc4438', 'e0726a'],
  '--font-sans': ["'Geist', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"],
  '--font-mono': ["'Geist Mono', ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace"],
  '--text-2xs': ['11px'],
  '--text-sm': ['13px'],
  '--leading-sm': ['19px'],
  '--text-md': ['14px'],
  '--leading-md': ['22px'],
  '--text-lg': ['16px'],
  '--leading-lg': ['26px'],
  '--text-xl': ['20px'],
  '--leading-xl': ['26px'],
  '--text-2xl': ['24px'],
  '--leading-2xl': ['30px'],
  '--text-3xl': ['36px'],
  '--leading-3xl': ['40px'],
  '--weight-regular': ['400'],
  '--weight-medium': ['500'],
  '--weight-semibold': ['600'],
  '--tracking-tight': ['-0.02em'],
  '--space-1': ['4px'],
  '--space-2': ['8px'],
  '--space-3': ['12px'],
  '--space-4': ['16px'],
  '--space-6': ['24px'],
  '--space-8': ['32px'],
  '--space-12': ['48px'],
  '--radius-sm': ['3px'],
  '--radius-md': ['6px'],
  '--radius-lg': ['10px'],
  '--radius-xl': ['16px'],
  '--radius-pill': ['100px'],
};

const resolve = (value: string) => (/^[0-9a-f]{6}$/.test(value) ? `#${value}` : value);

describe('tokens.css matches the DocGerdSoft brand bundle', () => {
  for (const [name, [light, dark]] of Object.entries(bundle)) {
    it(`${name} light`, () => {
      expect(themes.light?.get(name)).toBe(resolve(light));
    });
    if (dark === false) continue;
    it(`${name} dark`, () => {
      expect(themes.dark?.get(name)).toBe(resolve(dark || light));
    });
  }
});

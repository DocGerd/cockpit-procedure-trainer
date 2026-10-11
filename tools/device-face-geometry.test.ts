import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const packagesDir = resolve(import.meta.dirname, '../packages');
const tokens = readFileSync(
  resolve(import.meta.dirname, '../apps/web/src/styles/tokens.css'),
  'utf8',
);

// The first declaration is the base token scale; larger scales override it in media queries.
const token = (name: string): number => {
  const px = new RegExp(`--${name}:\\s*([\\d.]+)px`).exec(tokens)?.[1];
  if (px === undefined) throw new Error(`tokens.css has no --${name} in px`);
  return Number(px);
};

/** A `calc()` of px tokens and numbers, evaluated at the base token scale. */
function evaluateCalc(css: string): number {
  const source = css
    .trim()
    .replace(/^calc\(([\s\S]*)\)$/, '$1')
    .replace(/var\(--([\w-]+)\)/g, (_, name: string) => String(token(name)));
  const parts = source.match(/\d+(?:\.\d+)?|[-+*/()]/g) ?? [];
  if (parts.join('') !== source.replace(/\s+/g, '')) throw new Error(`Cannot evaluate ${css}`);
  let at = 0;
  const next = () => parts[at++];
  const primary = (): number => {
    const part = next();
    if (part === '(') {
      const value = sum();
      next();
      return value;
    }
    if (part === '-') return -primary();
    return Number(part);
  };
  const product = (): number => {
    let value = primary();
    while (parts[at] === '*' || parts[at] === '/')
      value = next() === '*' ? value * primary() : value / primary();
    return value;
  };
  const sum = (): number => {
    let value = product();
    while (parts[at] === '+' || parts[at] === '-')
      value = next() === '+' ? value + product() : value - product();
    return value;
  };
  return sum();
}

type Size = { width: number; height: number };
type Geometry = {
  FACE?: Size;
  FACE_SIZE_CSS?: { width: string; height: string };
  TARGET?: number;
  SPACE_1?: number;
};

const geometries = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith('device-'))
  .map((entry) => `${entry.name}/src/face/geometry.ts`)
  .filter((path) => existsSync(resolve(packagesDir, path)))
  .sort();

describe('evaluateCalc', () => {
  it('reads tokens and keeps operator precedence', () => {
    expect(evaluateCalc('calc(var(--space-12) * 7 + var(--space-1))')).toBe(
      token('space-12') * 7 + token('space-1'),
    );
    expect(evaluateCalc('calc((var(--space-1) + 2) / 2)')).toBe((token('space-1') + 2) / 2);
  });
});

describe('device face geometry against the tokens', () => {
  it('finds the devices that draw their own face', () => {
    expect(geometries.length).toBeGreaterThan(0);
  });

  describe.each(geometries)('%s', (path) => {
    const load = async () => (await import(resolve(packagesDir, path))) as Geometry;

    it('sizes the face box in tokens to its natural size at the base scale', async () => {
      const { FACE, FACE_SIZE_CSS } = await load();
      if (FACE_SIZE_CSS === undefined) return;
      expect(FACE).toBeDefined();
      expect(evaluateCalc(FACE_SIZE_CSS.width)).toBeCloseTo(FACE?.width ?? Number.NaN);
      expect(evaluateCalc(FACE_SIZE_CSS.height)).toBeCloseTo(FACE?.height ?? Number.NaN);
    });

    it('takes its base token values from tokens.css', async () => {
      const { TARGET, SPACE_1 } = await load();
      if (TARGET !== undefined) expect(TARGET).toBe(token('size-target'));
      if (SPACE_1 !== undefined) expect(SPACE_1).toBe(token('space-1'));
    });
  });
});

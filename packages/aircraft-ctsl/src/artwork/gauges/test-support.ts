// @ts-expect-error aircraft-ctsl declares no node types; its manifest belongs to the scaffold
import { readFileSync } from 'node:fs';
import type { Appearance, IndicatorDefinition } from '@cpt/core';
import { expect } from 'vitest';
import { indicators } from '../../indicators';

type Artwork = Extract<Appearance, { artwork: unknown }>['artwork'];
type Scale = { min: number; max: number };

const fileOf = (url: string) => url.slice(url.lastIndexOf('/') + 1);

export const readFace = (url: string): string =>
  readFileSync(new URL(`../../assets/artwork/${fileOf(url)}`, import.meta.url), 'utf8');

const lookup = (id: string) => {
  const appearance = (indicators as Record<string, IndicatorDefinition<unknown>>)[id]?.appearance;
  const artwork: Artwork | undefined =
    appearance && 'artwork' in appearance ? appearance.artwork : undefined;
  return { artwork, moving: artwork?.moving };
};

const needleIndicator = (id: string) => {
  const { artwork, moving } = lookup(id);
  if (!artwork || moving?.type !== 'needle') throw new Error(`${id} has no needle`);
  return { artwork, moving };
};

const standardSweep = { min: -135, max: 135 };

export const expectNeedleOverScale = (id: string, scale: Scale, sweep: Scale = standardSweep) => {
  const { artwork, moving } = lookup(id);
  expect(artwork, id).toBeDefined();
  expect(moving?.type).toBe('needle');
  if (moving?.type !== 'needle') return;
  expect(moving.valueRange).toEqual(scale);
  expect(moving.angleRange).toEqual(sweep);
  expect(moving.pivot).toEqual({ x: 100, y: 100 });
};

export const expectLetteringClearOfSweep = (id: string) => {
  const { artwork, moving } = needleIndicator(id);
  const textTag =
    /<text x="([\d.]+)" y="([\d.]+)" font-size="(\d+)"[^>]*text-anchor="(\w+)"[^>]*>([^<]*)<\/text>/g;
  let lettering = 0;
  for (const [, x, y, size, anchor, content] of readFace(artwork.face).matchAll(textTag)) {
    const [cx, cy, fontSize] = [Number(x) - 100, Number(y) - 100, Number(size)];
    if (/^\d*\.?\d+$/.test(content ?? '') && Math.abs(Math.hypot(cx, cy) - 46) < 3) continue;
    lettering += 1;
    const width = (content?.length ?? 0) * 0.72 * fontSize;
    const left = anchor === 'start' ? cx : cx - width / 2;
    for (const dx of [left, left + width]) {
      for (const dy of [cy - fontSize / 2, cy + fontSize / 2]) {
        const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
        const swept = [-360, 0, 360].some(
          (turn) =>
            angle + turn >= moving.angleRange.min - 3 && angle + turn <= moving.angleRange.max + 3,
        );
        expect(swept, `${id}: "${content}" at ${dx.toFixed(0)},${dy.toFixed(0)}`).toBe(false);
      }
    }
  }
  expect(lettering, id).toBeGreaterThan(0);
};

// Scale values in the order the face prints its numerals.
export const expectNumeralsOnTicks = (id: string, values: number[]) => {
  const { artwork, moving } = needleIndicator(id);
  const { angleRange, valueRange } = moving;
  const numerals = [
    ...readFace(artwork.face).matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>(\d*\.?\d+)<\/text>/g),
  ]
    .map(([, x, y, content]) => ({ dx: Number(x) - 100, dy: Number(y) - 100, content }))
    .filter(({ dx, dy }) => Math.abs(Math.hypot(dx, dy) - 47) < 7);
  expect(numerals).toHaveLength(values.length);
  numerals.forEach(({ dx, dy, content }, index) => {
    const value = values[index] ?? NaN;
    const tick =
      angleRange.min +
      ((value - valueRange.min) / (valueRange.max - valueRange.min)) *
        (angleRange.max - angleRange.min);
    const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
    const off = Math.min(...[-360, 0, 360].map((turn) => Math.abs(angle + turn - tick)));
    expect(off, `${id}: "${content}" for ${value} at ${angle.toFixed(1)}°`).toBeLessThan(1);
  });
};

import { describe, expect, it } from 'vitest';
import { oilPressure } from './oil-pressure';
import { readFace } from './test-support';

// Intake §3.10.9: model angle of a bar value, in two segments.
const modelAngle = (bar: number) => (bar <= 7 ? -124 + 24 * bar : 44 + 30 * (bar - 7));

// Measured numeral angle and radius (fraction of the case radius) per bar; the 0 numeral hides
// under the needle, so its angle is the model's.
const NUMERALS: Record<number, { angle: number; radius: number }> = {
  0: { angle: -124, radius: 0.52 },
  1: { angle: -98, radius: 0.61 },
  2: { angle: -74, radius: 0.66 },
  3: { angle: -54, radius: 0.7 },
  4: { angle: -32, radius: 0.71 },
  5: { angle: -8, radius: 0.7 },
  6: { angle: 16, radius: 0.62 },
  7: { angle: 40, radius: 0.59 },
  8: { angle: 70, radius: 0.54 },
  9: { angle: 102, radius: 0.53 },
  10: { angle: 134, radius: 0.46 },
};
const RED = '#b04848';
const polar = (x: number, y: number) => ({
  angle: (Math.atan2(x - 100, 100 - y) * 180) / Math.PI,
  radius: Math.hypot(x - 100, y - 100) / 100,
});
const texts = (svg: string) =>
  [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map(([, attributes = '', content = '']) => ({
    attributes,
    content,
    x: Number(/ x="([\d.]+)"/.exec(attributes)?.[1]),
    y: Number(/ y="([\d.]+)"/.exec(attributes)?.[1]),
  }));
const ticks = (svg: string) =>
  [
    ...svg.matchAll(
      /<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)" stroke="(#[0-9A-Fa-f]+)"/g,
    ),
  ]
    .map(([, x1, y1, x2, y2, stroke]) => {
      const inner = polar(Number(x1), Number(y1));
      const outer = polar(Number(x2), Number(y2));
      return {
        angle: outer.angle,
        outer: outer.radius,
        length: outer.radius - inner.radius,
        stroke,
      };
    })
    .filter(({ outer }) => Math.abs(outer - 0.84) < 0.005);
const arcs = (svg: string) =>
  [
    ...svg.matchAll(
      /<path data-arc="" d="M([\d.]+) ([\d.]+)A[\d.]+ [\d.]+ 0 0 1 ([\d.]+) ([\d.]+)"/g,
    ),
  ].map(([, x1, y1, x2, y2]) => [
    polar(Number(x1), Number(y1)).angle,
    polar(Number(x2), Number(y2)).angle,
  ]);

describe('CTSL oil pressure gauge', () => {
  const { options, artwork } = oilPressure;
  const face = readFace(artwork.face);
  const { moving } = artwork;
  if (moving.type !== 'needle') throw new Error('the oil pressure gauge has no needle');

  it('keeps the readout on the real 0 to 10 bar scale', () => {
    expect(options).toMatchObject({ min: 0, max: 10, units: 'bar' });
  });

  it('turns the needle 24 degrees per bar from the 0 mark to the 7 mark, the first segment', () => {
    expect(moving.pivot).toEqual({ x: 100, y: 100 });
    expect(moving.valueRange).toEqual({ min: 0, max: 7 });
    const angleAt = (bar: number) => {
      const { valueRange, angleRange } = moving;
      return (
        angleRange.min +
        ((bar - valueRange.min) / (valueRange.max - valueRange.min)) *
          (angleRange.max - angleRange.min)
      );
    };
    for (let bar = 0; bar <= 7; bar += 1) {
      expect(angleAt(bar), `${bar} bar`).toBeCloseTo(modelAngle(bar), 6);
    }
    expect(moving.angleRange.min).toBe(-124);
  });

  it('prints every integer from 0 to 10 at its measured angle and radius', () => {
    const numerals = texts(face).filter(({ content }) => /^\d+$/.test(content));
    expect(numerals.map(({ content }) => Number(content))).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    for (const { content, x, y } of numerals) {
      const expected = NUMERALS[Number(content)];
      const found = polar(x, y);
      expect(found.angle, `${content} angle`).toBeCloseTo(expected?.angle ?? NaN, 0);
      expect(found.radius, `${content} radius`).toBeCloseTo(expected?.radius ?? NaN, 1);
    }
  });

  it('puts a tick at every half bar on the two-segment scale, 5 just left of the top', () => {
    const angles = ticks(face).map(({ angle }) => angle);
    expect(angles).toHaveLength(21);
    for (let half = 0; half <= 20; half += 1) {
      expect(
        angles.some((angle) => Math.abs(angle - modelAngle(half / 2)) < 0.5),
        `${half / 2} bar`,
      ).toBe(true);
    }
    expect(Math.abs(modelAngle(5.2))).toBeLessThan(2);
    expect(modelAngle(5)).toBeLessThan(0);
  });

  it('draws short ticks from 0 to 7 and heavy bars from 7 to 10, with the 7 tick red', () => {
    const tickAt = (bar: number) =>
      ticks(face).find(({ angle }) => Math.abs(angle - modelAngle(bar)) < 0.5);
    expect(tickAt(4)?.length).toBeLessThan(0.08);
    for (const bar of [8, 9, 10]) expect(tickAt(bar)?.length, `${bar} bar`).toBeGreaterThan(0.18);
    expect(tickAt(8.5)?.length).toBeGreaterThan(0.1);
    expect(tickAt(8.5)?.length).toBeLessThan(0.2);
    expect(tickAt(7)?.stroke).toBe(RED);
    expect(tickAt(7)?.length).toBeGreaterThan(0.12);
    expect(ticks(face).filter(({ stroke }) => stroke === RED)).toHaveLength(1);
  });

  it('marks 1 to 2, 5 to 6 and 6 to 7 bar, nothing from 2 to 5 and no red radial at 5', () => {
    const found = arcs(face);
    expect(found).toHaveLength(3);
    [
      [1, 2],
      [5, 6],
      [6, 7],
    ].forEach(([from = NaN, to = NaN], index) => {
      expect(found[index]?.[0], `${from} start`).toBeCloseTo(modelAngle(from), 0);
      expect(found[index]?.[1], `${to} end`).toBeCloseTo(modelAngle(to), 0);
    });
    expect(options?.['arcs']).toEqual([
      { from: 1, to: 2, colour: 'yellow' },
      { from: 5, to: 6, colour: 'green' },
      { from: 6, to: 7, colour: 'yellow' },
      { from: 6.9, to: 7.1, colour: 'red' },
    ]);
  });

  it('prints BAR in the upper centre and OIL PRESS in the lower part', () => {
    const words = texts(face).filter(({ content }) => !/^\d+$/.test(content));
    expect(words.map(({ content }) => content)).toEqual(['BAR', 'OIL', 'PRESS']);
    expect(words.map(({ x, y }) => [Math.round(x), Math.round(y)])).toEqual([
      [96, 72],
      [100, 147],
      [98, 169],
    ]);
  });

  it('marks all lettering secondary, since the numerals fall below the 11 px floor at 0.40 A', () => {
    const lettering = texts(face);
    expect(lettering.length).toBeGreaterThan(0);
    for (const { attributes, content } of lettering) {
      expect(attributes, content).toContain('data-lettering="secondary"');
    }
  });
});

import { describe, expect, it } from 'vitest';
import { voltmeter } from './voltmeter';
import { readFace } from './test-support';

// Intake §3.10.8: measured numeral angle and radius (fraction of the case radius) per volt.
const NUMERALS: Record<number, { angle: number; radius: number }> = {
  9: { angle: -118, radius: 0.53 },
  10: { angle: -88, radius: 0.59 },
  11: { angle: -58, radius: 0.65 },
  12: { angle: -30, radius: 0.69 },
  13: { angle: -2, radius: 0.7 },
  14: { angle: 26, radius: 0.63 },
  15: { angle: 55, radius: 0.55 },
  16: { angle: 92, radius: 0.48 },
  17: { angle: 130, radius: 0.43 },
};
const DEGREES_PER_VOLT = 31;
const modelAngle = (volts: number) => DEGREES_PER_VOLT * (volts - 13);
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
      /<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)" stroke="#ECEAE3"/g,
    ),
  ]
    .map(([, x1, y1, x2, y2]) => {
      const inner = polar(Number(x1), Number(y1));
      const outer = polar(Number(x2), Number(y2));
      return { angle: outer.angle, outer: outer.radius, length: outer.radius - inner.radius };
    })
    .filter(({ outer }) => Math.abs(outer - 0.84) < 0.005);

describe('CTSL voltmeter gauge', () => {
  const { options, artwork } = voltmeter;
  const face = readFace(artwork.face);
  const { moving } = artwork;
  if (moving.type !== 'needle') throw new Error('the voltmeter has no needle');

  it('reads 9 to 17 V at 31 degrees per volt with 13 at the top (intake §3.10.8)', () => {
    expect(options).toMatchObject({ min: 9, max: 17, units: 'V' });
    expect(moving.valueRange).toEqual({ min: 9, max: 17 });
    expect(moving.pivot).toEqual({ x: 100, y: 100 });
    const angleAt = (volts: number) => {
      const { valueRange, angleRange } = moving;
      return (
        angleRange.min +
        ((volts - valueRange.min) / (valueRange.max - valueRange.min)) *
          (angleRange.max - angleRange.min)
      );
    };
    for (let volts = 9; volts <= 17; volts += 1) {
      expect(angleAt(volts), `${volts} V`).toBeCloseTo(modelAngle(volts), 6);
    }
    expect(angleAt(13)).toBe(0);
  });

  it('rests the needle on the 9 mark for a reading below the scale (§9 question 57)', () => {
    expect(moving.angleRange.min).toBe(modelAngle(9));
  });

  it('prints every integer from 9 to 17 at its measured angle and radius', () => {
    const numerals = texts(face).filter(({ content }) => /^\d+$/.test(content));
    expect(numerals.map(({ content }) => Number(content))).toEqual([
      9, 10, 11, 12, 13, 14, 15, 16, 17,
    ]);
    for (const { content, x, y } of numerals) {
      const expected = NUMERALS[Number(content)];
      const found = polar(x, y);
      expect(found.angle, `${content} angle`).toBeCloseTo(expected?.angle ?? NaN, 0);
      expect(found.radius, `${content} radius`).toBeCloseTo(expected?.radius ?? NaN, 1);
    }
  });

  it('puts a tick on every volt and a minor every quarter volt, none below 9 or above 17', () => {
    const found = ticks(face);
    expect(found).toHaveLength(33);
    const angles = found.map(({ angle }) => angle);
    expect(Math.min(...angles)).toBeCloseTo(modelAngle(9), 0);
    expect(Math.max(...angles)).toBeCloseTo(modelAngle(17), 0);
    for (let quarter = 36; quarter <= 68; quarter += 1) {
      expect(
        angles.some((angle) => Math.abs(angle - modelAngle(quarter / 4)) < 0.5),
        `tick at ${quarter / 4} V`,
      ).toBe(true);
    }
  });

  it('draws heavy bars from past 15 to 17, long at 16 and 17, and short dashes from 11 to 15', () => {
    const lengthAt = (volts: number) =>
      ticks(face).find(({ angle }) => Math.abs(angle - modelAngle(volts)) < 0.5)?.length ?? NaN;
    expect(lengthAt(16)).toBeGreaterThan(0.18);
    expect(lengthAt(17)).toBeGreaterThan(0.18);
    expect(lengthAt(15.5)).toBeGreaterThan(0.1);
    expect(lengthAt(15.5)).toBeLessThan(0.2);
    expect(lengthAt(12)).toBeLessThan(0.1);
    expect(lengthAt(9)).toBeGreaterThan(0.09);
  });

  it('shows no coloured arc, as the photographed dial has none (§9 question 58)', () => {
    expect(options?.['arcs']).toEqual([]);
    expect(face).not.toContain('data-arc');
  });

  it('prints VOLTS in the upper centre and VOLTMETER along the bottom', () => {
    const words = texts(face).filter(({ content }) => !/^\d+$/.test(content));
    expect(words.map(({ content }) => content)).toEqual(['VOLTS', 'VOLTMETER']);
    expect(words.map(({ x, y }) => [Math.round(x), Math.round(y)])).toEqual([
      [96, 68],
      [100, 160],
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

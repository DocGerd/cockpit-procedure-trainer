import { describe, expect, it } from 'vitest';
import { airspeed, airspeedScale } from './airspeed';
import { readFace } from './test-support';

const face = () => readFace(airspeed.artwork.face);

/** The printed scale between its measured numerals, which the face's ticks and arcs follow. */
const airspeedScaleAngle = (kmh: number): number => {
  const found = airspeedScale.findIndex(([value]) => value >= kmh);
  const upper = found === -1 ? airspeedScale.length - 1 : Math.max(found, 1);
  const hi = airspeedScale[upper];
  const lo = airspeedScale[upper - 1];
  if (!hi || !lo) throw new Error(`no scale segment for ${kmh} km/h`);
  const [[v0, a0], [v1, a1]] = [lo, hi];
  return a0 + ((kmh - v0) / (v1 - v0)) * (a1 - a0);
};

/** Bands at the dial edge (intake §3.10.1): radii in hundredths of the case radius. */
const airspeedArcs = [
  { mark: 'white', from: 72, to: 94, angles: [45, 69], radii: [79, 88] },
  { mark: 'white', from: 94, to: 115, angles: [69, 93], radii: [79, 82] },
  { mark: 'green', from: 94, to: 245, angles: [69, 235], radii: [83, 88] },
  { mark: 'yellow', from: 245, to: 300, angles: [235, 293], radii: [83, 88] },
] as const;

const polar = (x: number, y: number) => {
  const [dx, dy] = [x - 100, y - 100];
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return { r: Math.hypot(dx, dy), angle: angle < 0 ? angle + 360 : angle };
};

const needlePart = () => {
  const { moving } = airspeed.artwork;
  if (moving.type !== 'needle') throw new Error('the airspeed indicator has a needle');
  return moving;
};

/** panel-kit's `needleAngle` inside the value range, where it does not clamp. */
const needleAt = (kmh: number) => {
  const { valueRange, angleRange } = needlePart();
  if (kmh < valueRange.min || kmh > valueRange.max) throw new Error(`${kmh} km/h is off scale`);
  const fraction = (kmh - valueRange.min) / (valueRange.max - valueRange.min);
  return angleRange.min + fraction * (angleRange.max - angleRange.min);
};

describe('CTSL airspeed gauge', () => {
  it('pins the scale angles measured on D-MPGO’s dial (intake §3.10.1)', () => {
    expect(airspeedScale).toEqual([
      [40, 10],
      [60, 32],
      [80, 54],
      [100, 76],
      [120, 98],
      [140, 119],
      [160, 141],
      [180, 163],
      [200, 185],
      [220, 207],
      [240, 229],
      [260, 249],
      [280, 270],
      [300, 293],
      [320, 318],
      [340, 340],
    ]);
    expect(airspeedScaleAngle(50)).toBe(21);
    expect(airspeedScaleAngle(290)).toBe(281.5);
  });

  it('keeps the intake’s arc angles on the measured scale', () => {
    for (const { from, to, angles } of airspeedArcs) {
      expect(Math.abs(airspeedScaleAngle(from) - angles[0]), `${from}`).toBeLessThanOrEqual(1.5);
      expect(Math.abs(airspeedScaleAngle(to) - angles[1]), `${to}`).toBeLessThanOrEqual(1.5);
    }
  });

  it('keeps the photographed markings for the fallback widget, 40 to 340 km/h', () => {
    const { options } = airspeed;
    expect(options).toMatchObject({ min: 40, max: 340, units: 'km/h', decimals: 0 });
    expect(options?.['ticks']).toEqual(airspeedScale.map(([kmh]) => kmh));
    expect(options?.['arcs']).toEqual([
      { from: 72, to: 115, colour: 'white' },
      { from: 94, to: 245, colour: 'green' },
      { from: 245, to: 300, colour: 'yellow' },
      { from: 299, to: 301, colour: 'red' },
    ]);
  });

  it('rests the needle on the 12 o’clock index and sweeps clockwise almost a full turn', () => {
    const { valueRange, angleRange } = needlePart();
    expect(angleRange).toEqual({ min: 0, max: 340 });
    expect(valueRange.min).toBeCloseTo(40 - 10 / 1.1, 9);
    expect(valueRange.max).toBe(340);
    expect(needleAt(35)).toBeGreaterThan(0);
    expect(needleAt(35)).toBeLessThan(10);
    expect(needleAt(40)).toBeCloseTo(10, 6);
  });

  it('points the needle at each measured numeral within the intake’s tolerance', () => {
    for (const [kmh, angle] of airspeedScale) {
      const allowed = kmh >= 260 && kmh <= 300 ? 4 : 1.001;
      expect(Math.abs(needleAt(kmh) - angle), `${kmh} km/h`).toBeLessThanOrEqual(allowed);
    }
  });

  it('draws the lance needle of its own without a glass, glare or hub cap', () => {
    const { artwork } = airspeed;
    expect(artwork.glass).toBeUndefined();
    if (artwork.moving.type !== 'needle') throw new Error('the airspeed indicator has a needle');
    expect(artwork.moving.image).toMatch(/gauge-airspeed-needle\.svg$/);
    expect(artwork.moving.pivot).toEqual({ x: 100, y: 100 });
    const lance = readFace(artwork.moving.image);
    const [, left, tip] = /data-lance="" d="M([\d.]+) 92V[\d.]+L100 ([\d.]+)/.exec(lance) ?? [];
    expect(100 - Number(left)).toBeGreaterThanOrEqual(2.2);
    expect(100 - Number(left)).toBeLessThanOrEqual(2.5);
    expect(Number(tip)).toBe(25);
  });

  it('prints the sixteen upright numerals at their measured angles', () => {
    const numerals = [...face().matchAll(/<text x="([\d.]+)" y="([\d.]+)"([^>]*)>(\d+)<\/text>/g)];
    expect(numerals.map(([, , , , value]) => Number(value))).toEqual(
      airspeedScale.map(([kmh]) => kmh),
    );
    numerals.forEach(([, x, y, attributes, value], index) => {
      const { r, angle } = polar(Number(x), Number(y));
      expect(Math.abs(r - 60), `${value} radius`).toBeLessThan(0.5);
      expect(Math.abs(angle - (airspeedScale[index]?.[1] ?? NaN)), `${value}`).toBeLessThan(0.5);
      expect(attributes).not.toMatch(/transform|bold/);
      expect(attributes).toContain('data-lettering="secondary"');
    });
  });

  it('runs a tick every 10 km/h out to the dial edge, the red line in place of 300', () => {
    const ticks = [
      ...face().matchAll(
        /<line data-kmh="(\d+)" x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g,
      ),
    ];
    const values = ticks.map(([, kmh]) => Number(kmh));
    expect(values).toEqual(
      Array.from({ length: 31 }, (_, index) => 40 + index * 10).filter((kmh) => kmh !== 300),
    );
    for (const [, kmh, x1, y1, x2, y2] of ticks) {
      const value = Number(kmh);
      const inner = polar(Number(x1), Number(y1));
      const outer = polar(Number(x2), Number(y2));
      expect(Math.abs(inner.angle - airspeedScaleAngle(value)), kmh).toBeLessThan(0.5);
      expect(Math.abs(outer.angle - airspeedScaleAngle(value)), kmh).toBeLessThan(0.5);
      expect(outer.r).toBeCloseTo(88, 0);
      expect(inner.r).toBeCloseTo(value % 20 === 0 ? 72 : 74, 0);
    }
    const red =
      /<line data-mark="red-line" x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/.exec(
        face(),
      );
    const inner = polar(Number(red?.[1]), Number(red?.[2]));
    const outer = polar(Number(red?.[3]), Number(red?.[4]));
    expect(inner.angle).toBeCloseTo(293, 0);
    expect(outer.angle).toBeCloseTo(293, 0);
    expect([inner.r, outer.r].map(Math.round)).toEqual([67, 87]);
  });

  it('paints each arc band between its intake angles and radii', () => {
    const bands = [
      ...face().matchAll(
        /<path data-arc="(\w+)" d="M([\d.]+) ([\d.]+)A([\d.]+) [\d.]+ 0 [01] 1 ([\d.]+) ([\d.]+)L[\d.]+ [\d.]+A([\d.]+)/g,
      ),
    ];
    expect(bands).toHaveLength(airspeedArcs.length);
    bands.forEach(([, mark, sx, sy, outerR, ex, ey, innerR], index) => {
      const arc = airspeedArcs[index];
      expect(mark).toBe(arc?.mark);
      expect(polar(Number(sx), Number(sy)).angle).toBeCloseTo(arc?.angles[0] ?? NaN, 0);
      expect(polar(Number(ex), Number(ey)).angle).toBeCloseTo(arc?.angles[1] ?? NaN, 0);
      expect([Number(innerR), Number(outerR)]).toEqual(arc?.radii);
    });
  });

  it('marks the rest index at 12 o’clock, inside the scale', () => {
    const [, x, y, width, height] =
      /<rect data-mark="rest-index" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/
        .exec(face())
        ?.map(Number) ?? [];
    const [top, bottom] = [polar(100, Number(y)), polar(100, Number(y) + Number(height))];
    expect(Number(x) + Number(width) / 2).toBeCloseTo(100, 6);
    expect(top.angle).toBe(0);
    expect(bottom.r).toBeGreaterThanOrEqual(77);
    expect(top.r).toBeLessThanOrEqual(85);
  });

  it('prints AIRSPEED over the KmH legend above the hub, and no maker name', () => {
    const words = [
      ...face().matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>([^<\d][^<]*)<\/text>/g),
    ];
    expect(words.map(([, x, y, content]) => [content, Number(x), Number(y)])).toEqual([
      ['AIRSPEED', 100, 67],
      ['KmH', 100, 81],
    ]);
  });

  it('seats four cross-head screws at the corners of the case’s square', () => {
    const screws = [
      ...face().matchAll(/<g data-screw="" transform="translate\(([\d.]+) ([\d.]+)\)/g),
    ];
    expect(screws.map(([, x, y]) => [Number(x), Number(y)])).toEqual([
      [23, 23],
      [177, 23],
      [177, 177],
      [23, 177],
    ]);
  });
});

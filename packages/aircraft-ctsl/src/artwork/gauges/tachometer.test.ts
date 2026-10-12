import { describe, expect, it } from 'vitest';
import { expectNeedleOverScale, readFace } from './test-support';
import { tachometer } from './tachometer';

const SWEEP = { min: -142, max: 142 };
const MAX_RPM = 7000;
const angleOf = (rpm: number) => SWEEP.min + ((SWEEP.max - SWEEP.min) * rpm) / MAX_RPM;
const CENTRE = 100;
const R = 95;

// Intake §3.10.5 measured angles (±4°) of the printed numerals.
const MEASURED: ReadonlyArray<readonly [number, number]> = [
  [0, -141],
  [1000, -99],
  [2000, -63],
  [3000, -19],
  [4000, 19],
  [5000, 62],
  [6000, 105],
  [7000, 145],
];

const clockAngle = (x: number, y: number) => (Math.atan2(x - CENTRE, CENTRE - y) * 180) / Math.PI;
const attribute = (tag: string, name: string) =>
  Number(new RegExp(`\\b${name}="(-?[\\d.]+)"`).exec(tag)?.[1]);

const face = () => readFace(tachometer.artwork.face);
const tags = (svg: string, pattern: RegExp) => [...svg.matchAll(pattern)].map(([tag]) => tag);

describe('CTSL tachometer gauge', () => {
  it("sweeps the needle 284 degrees, symmetric about 12 o'clock", () => {
    expectNeedleOverScale('tachometer', { min: 0, max: MAX_RPM }, SWEEP);
    expect(angleOf(3500)).toBe(0);
  });

  it('keeps the linear angle within 4 degrees of every measured numeral', () => {
    for (const [rpm, measured] of MEASURED) {
      expect(Math.abs(angleOf(rpm) - measured), `${rpm} rpm`).toBeLessThanOrEqual(4);
    }
  });

  it('marks the low red, yellow, green, yellow and the red line at the photographed rpm', () => {
    expect(tachometer.options?.['arcs']).toEqual([
      { from: 0, to: 1400, colour: 'red' },
      { from: 1400, to: 1800, colour: 'yellow' },
      { from: 1800, to: 5500, colour: 'green' },
      { from: 5500, to: 5800, colour: 'yellow' },
      { from: 5780, to: 5820, colour: 'red' },
    ]);
  });

  it('prints 0 to 70 in hundreds of rpm on the 1000 rpm ticks, 0.59 R from the hub', () => {
    const numerals = tags(face(), /<text\b[^>]*>\d+<\/text>/g).map((tag) => ({
      value: Number(/>(\d+)</.exec(tag)?.[1]),
      x: attribute(tag, 'x'),
      y: attribute(tag, 'y'),
    }));
    expect(numerals.map(({ value }) => value)).toEqual([0, 10, 20, 30, 40, 50, 60, 70]);
    for (const { value, x, y } of numerals) {
      expect(Math.hypot(x - CENTRE, y - CENTRE), `${value}`).toBeCloseTo(0.59 * R, 0);
      expect(Math.abs(clockAngle(x, y) - angleOf(value * 100)), `${value}`).toBeLessThan(0.5);
    }
  });

  it('letters TACH, RPM and x100, never ×1000', () => {
    const words = tags(face(), /<text\b[^>]*>[^<\d][^<]*<\/text>/g).map(
      (tag) => /<text\b[^>]*>([^<]*)</.exec(tag)?.[1],
    );
    expect(words).toEqual(['TACH', 'RPM', 'x100']);
  });

  it('ticks every 200 rpm, long and thick from 6000 to 7000', () => {
    const ticks = tags(face(), /<line\b[^>]*data-tick="\d+"[^>]*\/>/g).map((tag) => ({
      rpm: attribute(tag, 'data-tick'),
      inner: Math.hypot(attribute(tag, 'x1') - CENTRE, attribute(tag, 'y1') - CENTRE),
      angle: clockAngle(attribute(tag, 'x2'), attribute(tag, 'y2')),
      width: attribute(tag, 'stroke-width'),
    }));
    expect(ticks.map(({ rpm }) => rpm)).toEqual(Array.from({ length: 36 }, (_, i) => i * 200));
    for (const { rpm, angle, inner, width } of ticks) {
      expect(Math.abs(angle - angleOf(rpm)), `${rpm}`).toBeLessThan(0.5);
      const long = rpm % 1000 === 0 || rpm >= 6000;
      expect(inner, `${rpm}`).toBeCloseTo((long ? 0.7 : 0.76) * R, 0);
      expect(width, `${rpm}`).toBeCloseTo((long ? 0.035 : 0.02) * R, 1);
    }
  });

  it('draws each arc between the angles of its rpm limits', () => {
    const arcs = tags(face(), /<path\b[^>]*data-arc="[^"]+"[^>]*\/>/g).map((tag) => {
      const [x1, y1, , , , , , x2, y2] = [
        ...(/ d="([^"]+)"/.exec(tag)?.[1] ?? '').matchAll(/-?[\d.]+/g),
      ].map(([n]) => Number(n));
      return {
        id: /data-arc="([^"]+)"/.exec(tag)?.[1],
        from: clockAngle(x1 ?? NaN, y1 ?? NaN),
        to: clockAngle(x2 ?? NaN, y2 ?? NaN),
      };
    });
    const expected = [
      ['red-low', 0, 1400],
      ['yellow-low', 1400, 1800],
      ['green', 1800, 5500],
      ['yellow-high', 5500, 5800],
    ] as const;
    expect(arcs.map(({ id }) => id)).toEqual(expected.map(([id]) => id));
    expected.forEach(([id, from, to], index) => {
      expect(Math.abs((arcs[index]?.from ?? NaN) - angleOf(from)), id).toBeLessThan(0.5);
      expect(Math.abs((arcs[index]?.to ?? NaN) - angleOf(to)), id).toBeLessThan(0.5);
    });
  });

  it('puts the red line at 5800 rpm, radial from 0.68 R to 0.87 R', () => {
    const [line] = tags(face(), /<line\b[^>]*data-arc="red-line"[^>]*\/>/g);
    expect(line).toBeDefined();
    const tag = line ?? '';
    const inner = Math.hypot(attribute(tag, 'x1') - CENTRE, attribute(tag, 'y1') - CENTRE);
    const outer = Math.hypot(attribute(tag, 'x2') - CENTRE, attribute(tag, 'y2') - CENTRE);
    expect(inner).toBeCloseTo(0.68 * R, 0);
    expect(outer).toBeCloseTo(0.87 * R, 0);
    expect(
      Math.abs(clockAngle(attribute(tag, 'x2'), attribute(tag, 'y2')) - angleOf(5800)),
    ).toBeLessThan(0.5);
  });

  it('points a tapered wedge from 0.18 R to 0.88 R, broad at the hub', () => {
    const { moving } = tachometer.artwork;
    if (moving.type !== 'needle') throw new Error('the tachometer has a needle');
    expect(moving.image).toMatch(/gauge-tach-needle\.svg$/);
    const wedge = readFace(moving.image);
    const [, d = ''] = /<path d="([^"]+)"/.exec(wedge) ?? [];
    const ys = [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(([, , y]) => CENTRE - Number(y));
    expect(Math.min(...ys.filter((offset) => offset > 0))).toBeCloseTo(0.18 * R, 0);
    expect(Math.max(...ys)).toBeCloseTo(0.88 * R, 0);
  });

  it('draws no hub cap or glare over the dial', () => {
    expect(tachometer.artwork.glass).toBeUndefined();
  });
});

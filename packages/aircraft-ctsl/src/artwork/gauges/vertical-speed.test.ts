import { describe, expect, it } from 'vitest';
import { verticalSpeed } from './vertical-speed';
import { expectNeedleOverScale, readFace } from './test-support';

const scale = { min: -2000, max: 2000 };
const sweep = { min: -270, max: 90 };

// Intake §3.10.3: measured angle of each value, 0° at 12 o'clock, clockwise positive.
const measured: ReadonlyArray<readonly [number, number]> = [
  [0, -90],
  [500, -45],
  [1000, 0],
  [1500, 45],
  [2000, 90],
  [-500, -135],
  [-1000, 180],
  [-1500, 135],
];

const angleFor = (value: number) =>
  sweep.min + ((value - scale.min) / (scale.max - scale.min)) * (sweep.max - sweep.min);

const face = () => readFace(verticalSpeed.artwork.face);
const angleOf = (x: number, y: number) =>
  ((((Math.atan2(x - 100, 100 - y) * 180) / Math.PI) % 360) + 360) % 360;
const near = (a: number, b: number) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);
const radiusOf = (x: number, y: number) => Math.hypot(x - 100, y - 100);
const within = (value: number, target: number, tolerance: number) =>
  Math.abs(value - target) <= tolerance;
const numbersIn = (text: string) => (text.match(/-?\d*\.?\d+/g) ?? []).map(Number);

const textOf = (text: string) => {
  const found = new RegExp(
    `<text x="([\\d.]+)" y="([\\d.]+)" font-size="([\\d.]+)"[^>]*>${text}</text>`,
  ).exec(face());
  expect(found, `"${text}" is printed on the face`).not.toBeNull();
  const [, x, y, size] = found ?? [];
  return { x: Number(x), y: Number(y), size: Number(size) };
};

// along the stub's axis (towards the lower left) and aside of it, in dial units from the centre
const alongAndAside = ([x, y]: readonly [number, number]) => ({
  along: (100 - x + (y - 100)) / Math.SQRT2,
  aside: (x - 100 + (y - 100)) / Math.SQRT2,
});

describe('CTSL vertical speed gauge', () => {
  it('reads the vertical speed in ft/min, ±2000, ticks every 500', () => {
    const { options } = verticalSpeed;
    expect(options).toMatchObject({ min: -2000, max: 2000, units: 'ft/min' });
    expect(options?.['ticks']).toEqual([-2000, -1500, -1000, -500, 0, 500, 1000, 1500, 2000]);
  });

  it('draws verticalSpeed as a needle over its intake scale', () => {
    expectNeedleOverScale('verticalSpeed', scale, sweep);
  });

  it('rests at 9 o’clock, climbs clockwise over the top, descends counter-clockwise under the bottom', () => {
    for (const [value, angle] of measured) {
      expect(near(angleFor(value), angle), `${value} ft/min`).toBeLessThan(1e-6);
    }
    expect(near(angleFor(-2000), angleFor(2000))).toBeLessThan(1e-6);
  });

  it('uses a VSI paddle and a glass without a hub cap', () => {
    const { moving, glass } = verticalSpeed.artwork;
    if (moving.type !== 'needle') throw new Error('the VSI has a needle');
    expect(moving.image).toContain('gauge-vsi-needle');
    expect(glass).toBeDefined();
    const glassSvg = readFace(glass ?? '');
    expect([...glassSvg.matchAll(/<(circle|ellipse|rect|polygon|line)\b/g)]).toEqual([]);
    for (const [, d] of glassSvg.matchAll(/<path d="([^"]+)"/g)) {
      const points = (d ?? '').matchAll(
        /M([\d.]+) ([\d.]+)|A[\d.]+ [\d.]+ \d \d \d ([\d.]+) ([\d.]+)/g,
      );
      for (const [, mx, my, ax, ay] of points) {
        expect(radiusOf(Number(mx ?? ax), Number(my ?? ay))).toBeGreaterThan(15);
      }
    }
  });

  it('draws the paddle as one path from 0.11 R to 0.85 R, 0.09 R wide', () => {
    const { moving } = verticalSpeed.artwork;
    if (moving.type !== 'needle') throw new Error('the VSI has a needle');
    const paddle = readFace(moving.image);
    expect([...paddle.matchAll(/<path\b/g)]).toHaveLength(1);
    const [left, bottom, right, taperEnd, tipX, tipY] = numbersIn(
      /<path d="([^"]+)"/.exec(paddle)?.[1] ?? '',
    ) as [number, number, number, number, number, number];
    expect(bottom).toBeCloseTo(89, 0);
    expect(tipY).toBeCloseTo(15, 0);
    expect(tipX).toBeCloseTo(100, 0);
    expect(right - left).toBeCloseTo(9, 0);
    expect(taperEnd).toBeCloseTo(36, 0);
  });

  it('draws three cross-head screws and a stub at 225° in place of the fourth', () => {
    const svg = face();
    const screws = [
      ...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="12.7" fill="url\(#screw\)"/g),
    ]
      .map(([, x, y]) => [Number(x), Number(y)] as const)
      .sort(([ax, ay], [bx, by]) => ay - by || ax - bx);
    expect(screws).toEqual([
      [16, 17],
      [184, 17],
      [184, 183],
    ]);

    const stubLines = [
      ...svg.matchAll(
        /<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)" stroke="(?:#0B0C0E|#3A3E44)" stroke-width="([\d.]+)"/g,
      ),
    ].map(([, x1, y1, x2, y2, width]) => ({
      width: Number(width),
      ends: [alongAndAside([Number(x1), Number(y1)]), alongAndAside([Number(x2), Number(y2)])],
    }));
    const [stub, highlight, ...rest] = stubLines;
    expect(rest).toEqual([]);
    expect(stub?.width).toBe(10);
    expect(stub?.ends.map(({ along }) => along)).toEqual([
      expect.closeTo(105, 0),
      expect.closeTo(125, 0),
    ]);
    for (const { aside } of stub?.ends ?? []) expect(aside).toBeCloseTo(0, 0);
    expect(highlight?.ends).toHaveLength(2);
    for (const { along, aside } of highlight?.ends ?? []) {
      expect(within(along, 115, 10.5)).toBe(true);
      expect(Math.abs(aside)).toBeGreaterThan(2);
      expect(Math.abs(aside)).toBeLessThan(5);
    }
  });

  it('prints each numeral on its value’s radial at 0.60 R, and 2 once at 3 o’clock', () => {
    const numerals = [
      ...face().matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>(\d*\.?\d+)<\/text>/g),
    ].map(([, x, y, text]) => ({
      text,
      angle: angleOf(Number(x), Number(y)),
      radius: radiusOf(Number(x), Number(y)),
    }));
    expect(numerals.map(({ text }) => text)).toEqual([
      '0',
      '.5',
      '1',
      '1.5',
      '2',
      '.5',
      '1',
      '1.5',
    ]);
    const expected = measured.map(([, angle]) => ((angle % 360) + 360) % 360);
    numerals.forEach(({ text, angle, radius }, index) => {
      // ".5" is set so its digit, not the pair, sits on the radial
      const tolerance = text === '.5' ? 4 : 1;
      expect(near(angle, expected[index] ?? NaN), `"${text}" at ${angle.toFixed(1)}°`).toBeLessThan(
        tolerance,
      );
      expect(within(radius, 60, tolerance + 2), `"${text}" at r ${radius.toFixed(1)}`).toBe(true);
    });
  });

  it('prints the units legend below the hub, at the secondary-caption floor', () => {
    const units = textOf('1000 ft\\.');
    const perMin = textOf('per min\\.');
    const heading = textOf('VERTICAL');
    expect(within(units.y, 118, 3)).toBe(true);
    expect(within(perMin.y, 126, 3)).toBe(true);
    expect(perMin.y - units.y).toBeGreaterThanOrEqual(10);
    for (const { x, size } of [units, perMin]) {
      expect(within(x, 102, 3)).toBe(true);
      // the measured cap height (0.05 R) would render below the floor; ADR 0002, intake §9 item 53
      expect(size).toBe(heading.size);
    }
    expect(heading.y).toBeLessThan(100);
  });

  it('prints up and down legends and L-shaped arrows left of the hub', () => {
    const up = textOf('up');
    const down = textOf('down');
    expect(Math.hypot(up.x - 55, up.y - 89)).toBeLessThanOrEqual(5);
    expect(down.y).toBeCloseTo(200 - up.y, 0);
    expect(within(down.x, 55, 5)).toBe(true);

    const paths = [...face().matchAll(/<path d="([^"]+)"/g)]
      .filter(([, d]) => !/^M\d+ \d+H\d+M/.test(d ?? ''))
      .map(([, d]) => numbersIn(d ?? ''));
    // each arrow: a leg from the legend to the corner, a shaft to the head; the head is a triangle
    const [upArrow, upHead, downArrow, downHead] = paths;
    expect(upArrow).toEqual([48, 89, 34, 79]);
    expect(downArrow).toEqual([48, 111, 34, 121]);
    expect(within(upHead?.[3] ?? NaN, 75, 3)).toBe(true);
    expect(within(downHead?.[3] ?? NaN, 125, 3)).toBe(true);
  });

  it('draws a tick every 100 ft/min on both halves, the 2 once as an I-mark', () => {
    const lines = [
      ...face().matchAll(
        /<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)" stroke="#ECEAE3" stroke-width="([\d.]+)"/g,
      ),
    ].map(([, x1, y1, x2, y2, width]) => {
      const [ax, ay, bx, by] = [x1, y1, x2, y2].map(Number) as [number, number, number, number];
      return {
        from: { angle: angleOf(ax, ay), radius: radiusOf(ax, ay) },
        to: { angle: angleOf(bx, by), radius: radiusOf(bx, by) },
        width: Number(width),
      };
    });
    const ofWidth = (width: number) => lines.filter((line) => line.width === width);
    const expectAt = (found: typeof lines, values: number[], radii: readonly [number, number]) => {
      const want = values
        .map((value) => ((angleFor(value) % 360) + 360) % 360)
        .sort((a, b) => a - b);
      const got = found.map(({ from }) => from.angle).sort((a, b) => a - b);
      expect(got).toHaveLength(want.length);
      got.forEach((angle, index) => expect(near(angle, want[index] ?? NaN)).toBeLessThan(0.5));
      for (const { from, to } of found) {
        expect(near(from.angle, to.angle)).toBeLessThan(0.5);
        expect(within(from.radius, radii[0], 1)).toBe(true);
        expect(within(to.radius, radii[1], 1)).toBe(true);
      }
    };
    const hundreds = Array.from({ length: 19 }, (_, index) => (index + 1) * 100);
    const majors = [500, 1000, 1500];
    // the I-mark's serifs stand where the ±1900 ticks would
    const minors = hundreds.filter((value) => !majors.includes(value) && value !== 1900);
    expectAt(ofWidth(5), [0], [70, 88]);
    expectAt(ofWidth(3), [...majors, ...majors.map((value) => -value)], [70, 88]);
    expectAt(ofWidth(1.5), [...minors, ...minors.map((value) => -value)], [73, 86]);

    const [bar, ...rest] = ofWidth(2.5);
    expect(rest).toEqual([]);
    expect(bar?.from.radius).toBeCloseTo(81, 0);
    expect(bar?.to.radius).toBeCloseTo(81, 0);
    expect([bar?.from.angle, bar?.to.angle].map((angle) => near(angle ?? NaN, 90))).toEqual([
      expect.closeTo(9, 0),
      expect.closeTo(9, 0),
    ]);
    const serifs = ofWidth(2);
    expect(serifs).toHaveLength(2);
    expect(new Set(serifs.map(({ from }) => Math.sign(from.angle - 90))).size).toBe(2);
    for (const { from, to } of serifs) {
      expect(near(from.angle, to.angle)).toBeLessThan(0.5);
      expect(near(from.angle, 90)).toBeCloseTo(9, 0);
      expect(within(from.radius, 74, 1)).toBe(true);
      expect(within(to.radius, 88, 1)).toBe(true);
    }
  });
});

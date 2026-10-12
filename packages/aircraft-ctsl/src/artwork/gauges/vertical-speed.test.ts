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
    const { moving } = verticalSpeed.artwork;
    if (moving.type !== 'needle') throw new Error('the VSI has a needle');
    expect(moving.valueRange).toEqual(scale);
    expect(moving.angleRange).toEqual(sweep);
    for (const [value, angle] of measured) {
      expect(near(angleFor(value), angle), `${value} ft/min`).toBeLessThan(1e-6);
    }
    expect(near(angleFor(-2000), angleFor(2000))).toBeLessThan(1e-6);
  });

  it('uses a VSI paddle and a glass without a hub cap', () => {
    const { moving, glass } = verticalSpeed.artwork;
    if (moving.type !== 'needle') throw new Error('the VSI has a needle');
    expect(moving.image).toContain('gauge-vsi-needle');
    expect(readFace(glass ?? '')).not.toMatch(/<circle/);
  });

  it('prints each numeral on its value’s radial, and 2 once at 3 o’clock', () => {
    const numerals = [
      ...face().matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>(\d*\.?\d+)<\/text>/g),
    ].map(([, x, y, text]) => ({ text, angle: angleOf(Number(x), Number(y)) }));
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
    numerals.forEach(({ text, angle }, index) => {
      // ".5" is set so its digit, not the pair, sits on the radial
      const tolerance = text === '.5' ? 4 : 1;
      expect(near(angle, expected[index] ?? NaN), `"${text}" at ${angle.toFixed(1)}°`).toBeLessThan(
        tolerance,
      );
    });
  });

  it('prints the units legend below the hub and the up and down legends left of it', () => {
    const at = (text: string) =>
      new RegExp(`<text x="([\\d.]+)" y="([\\d.]+)"[^>]*>${text}</text>`).exec(face());
    const [, , unitsY] = at('1000 ft\\.') ?? [];
    const [, , perMinY] = at('per min\\.') ?? [];
    const [, upX, upY] = at('up') ?? [];
    const [, downX, downY] = at('down') ?? [];
    expect(Number(unitsY)).toBeGreaterThan(100);
    expect(Number(perMinY)).toBeGreaterThan(Number(unitsY));
    expect(Number(upY)).toBeLessThan(100);
    expect(Number(downY)).toBeGreaterThan(100);
    expect(Number(upX)).toBeLessThan(100);
    expect(Number(downX)).toBeLessThan(100);
    expect(at('VERTICAL')).not.toBeNull();
  });

  it('draws a tick every 100 ft/min on both halves, the 2 once as an I-mark', () => {
    const ticks = [
      ...face().matchAll(
        /<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)" stroke="#ECEAE3" stroke-width="(1\.5|3|5)"/g,
      ),
    ];
    const radials = ticks.map(([, x1, y1, , , width]) => ({
      angle: angleOf(Number(x1), Number(y1)),
      width: Number(width),
    }));
    const minors = radials.filter(({ width }) => width === 1.5);
    const majors = radials.filter(({ width }) => width === 3);
    const bars = radials.filter(({ width }) => width === 5);
    expect(bars).toHaveLength(1);
    expect(near(bars[0]?.angle ?? NaN, 270)).toBeLessThan(1);
    expect(majors).toHaveLength(6);
    expect(minors).toHaveLength(32);
  });
});

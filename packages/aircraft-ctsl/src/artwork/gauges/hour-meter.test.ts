import { describe, expect, it } from 'vitest';
import { hourMeter } from './hour-meter';
import { readFace } from './test-support';

const faceRect = (face: string): [number, number, number] => {
  const match = /<rect x="([\d.]+)" y="0" width="([\d.]+)" height="([\d.]+)"[^>]*data-face/.exec(
    face,
  );
  if (!match) throw new Error('the hour meter face has no data-face rect');
  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

describe('CTSL hour meter', () => {
  it('prints a drum counter of four whole hours and a tenths window, with HOURS under it', () => {
    const face = readFace(hourMeter.artwork.face);
    const texts = [...face.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(([, text]) => text);
    expect(texts).toEqual(['0', '5', '3', '2', '7', 'HOURS']);
  });

  it('puts a screw beyond each short end of the face, not on it', () => {
    const face = readFace(hourMeter.artwork.face);
    const [x, width] = faceRect(face);
    const screws = [
      ...face.matchAll(/<circle cx="([\d.]+)" cy="[\d.]+" r="17" fill="url\(#screw\)"/g),
    ].map(([, cx]) => Number(cx));
    expect(screws).toHaveLength(2);
    expect(screws[0]).toBeLessThan(x);
    expect(screws[1]).toBeGreaterThan(x + width);
  });

  it('shows the running glyph only while the engine runs', () => {
    const { images } = hourMeter.artwork.moving;
    expect(readFace(images.true)).toContain('<path');
    expect(readFace(images.false)).not.toContain('<path');
  });

  // Intake §3.10.10: the glyph's centre sits at 0.77 of the face width, 0.31 of its height.
  it("draws the running glyph at the face rect's upper right", () => {
    const face = readFace(hourMeter.artwork.face);
    const [x, width, height] = faceRect(face);
    const d = /<path d="([^"]+)"/.exec(readFace(hourMeter.artwork.moving.images.true))?.[1];
    if (!d) throw new Error('the running image has no glyph path');
    const xs: number[] = [];
    const ys: number[] = [];
    let at = { x: 0, y: 0 };
    for (const [, command = '', args = ''] of d.matchAll(/([MLHV])([^MLHVZ]*)/g)) {
      const values = args.match(/-?[\d.]+/g)?.map(Number) ?? [];
      if (command === 'H') at = { ...at, x: values[0] ?? at.x };
      else if (command === 'V') at = { ...at, y: values[0] ?? at.y };
      else at = { x: values[0] ?? at.x, y: values[1] ?? at.y };
      xs.push(at.x);
      ys.push(at.y);
    }
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    expect((cx - x) / width).toBeCloseTo(0.77, 1);
    expect(cy / height).toBeCloseTo(0.31, 1);
  });
});

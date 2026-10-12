import { describe, expect, it } from 'vitest';
import { hourMeter } from './hour-meter';
import { readFace } from './test-support';

describe('CTSL hour meter', () => {
  it('prints a drum counter of four whole hours and a tenths window, with HOURS under it', () => {
    const face = readFace(hourMeter.artwork.face);
    const texts = [...face.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(([, text]) => text);
    expect(texts).toEqual(['0', '5', '3', '2', '7', 'HOURS']);
  });

  it('puts a screw beyond each short end of the face, not on it', () => {
    const face = readFace(hourMeter.artwork.face);
    const [x, width] = (/<rect x="([\d.]+)" y="0" width="([\d.]+)"[^>]*data-face/.exec(face) ?? [])
      .slice(1)
      .map(Number);
    const screws = [
      ...face.matchAll(/<circle cx="([\d.]+)" cy="[\d.]+" r="17" fill="url\(#screw\)"/g),
    ].map(([, cx]) => Number(cx));
    expect(screws).toHaveLength(2);
    expect(screws[0]).toBeLessThan(x ?? 0);
    expect(screws[1]).toBeGreaterThan((x ?? 0) + (width ?? 0));
  });

  it('shows the running glyph only while the engine runs', () => {
    const { images } = hourMeter.artwork.moving;
    expect(readFace(images.true)).toContain('<path');
    expect(readFace(images.false)).not.toContain('<path');
  });
});

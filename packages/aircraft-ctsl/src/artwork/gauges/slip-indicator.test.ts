import { describe, expect, it } from 'vitest';
import { indicators } from '../../indicators';
import { slipIndicator } from './slip-indicator';
import { readFace } from './test-support';

describe('CTSL slip indicator', () => {
  it('rests the ball at the centre, as no sideslip is modelled', () => {
    expect(slipIndicator.artwork.moving.type).toBe('positions');
    expect(Object.keys(slipIndicator.artwork.moving.images)).toEqual(['centred']);
    expect(indicators.slipIndicator.select()).toBe('centred');
  });

  it('draws a plain ball tube: no ticks, no numerals, no pointer and no glass overlay', () => {
    const face = readFace(slipIndicator.artwork.face);
    expect(face).not.toMatch(/<text\b[^>]*>\d/);
    expect('glass' in slipIndicator.artwork).toBe(false);
  });

  it('draws the tube nearly straight: its middle sits within 0.04 R of its ends', () => {
    const face = readFace(slipIndicator.artwork.face);
    const tube = /<path d="M([\d.]+) ([\d.]+)Q([\d.]+) ([\d.]+) ([\d.]+) [\d.]+V/.exec(face);
    const [x0, y0, , control, x1] = tube?.slice(1).map(Number) ?? [];
    const sag = ((control ?? 0) - (y0 ?? 0)) / 2;
    expect(sag).toBeGreaterThan(0);
    expect(sag / 98).toBeLessThan(0.04);
    expect(((x1 ?? 0) - (x0 ?? 0)) / 98).toBeCloseTo(1.44, 1);
  });
});

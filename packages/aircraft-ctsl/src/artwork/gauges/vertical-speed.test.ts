import { describe, expect, it } from 'vitest';
import { verticalSpeed } from './vertical-speed';
import {
  expectLetteringClearOfSweep,
  expectNeedleOverScale,
  expectNumeralsOnTicks,
  readFace,
} from './test-support';

describe('CTSL vertical speed gauge', () => {
  it('reads the vertical speed in ft/min, ±2000, ticks every 500, printed as thousands', () => {
    const { options, artwork } = verticalSpeed;
    expect(options).toMatchObject({ min: -2000, max: 2000, units: 'ft/min' });
    expect(options?.['ticks']).toEqual([-2000, -1500, -1000, -500, 0, 500, 1000, 1500, 2000]);
    const face = readFace(artwork.face);
    const labels = [...face.matchAll(/<text\b[^>]*>([\d.]+)<\/text>/g)].map(([, value]) => value);
    expect(labels.slice(0, 9)).toEqual(['2', '1.5', '1', '.5', '0', '.5', '1', '1.5', '2']);
  });

  it('draws verticalSpeed as a needle over its intake scale', () => {
    expectNeedleOverScale('verticalSpeed', { min: -2000, max: 2000 }, { min: -225, max: 45 });
  });

  it('letters the face only where the needle never sweeps', () => {
    expectLetteringClearOfSweep('verticalSpeed');
  });

  it('prints every verticalSpeed numeral on its tick', () => {
    expectNumeralsOnTicks('verticalSpeed', [2000, 1500, 1000, 500, 0, -500, -1000, -1500, -2000]);
  });
});

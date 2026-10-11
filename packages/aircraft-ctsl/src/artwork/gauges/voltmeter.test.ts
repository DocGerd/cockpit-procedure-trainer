import { describe, expect, it } from 'vitest';
import { voltmeter } from './voltmeter';
import {
  expectLetteringClearOfSweep,
  expectNeedleOverScale,
  expectNumeralsOnTicks,
  readFace,
} from './test-support';

describe('CTSL voltmeter gauge', () => {
  it('reads the voltmeter 9 to 17 V, a bus voltage the trainer assumes (intake §3.5)', () => {
    const { options, artwork } = voltmeter;
    expect(options).toMatchObject({ min: 9, max: 17, units: 'V' });
    const face = readFace(artwork.face);
    const labels = [...face.matchAll(/>(\d+)<\/text>/g)].map(([, value]) => Number(value));
    expect(labels).toEqual([10, 12, 14, 16]);
  });

  it('draws voltmeter as a needle over its intake scale', () => {
    expectNeedleOverScale('voltmeter', { min: 9, max: 17 });
  });

  it('letters the face only where the needle never sweeps', () => {
    expectLetteringClearOfSweep('voltmeter');
  });

  it('prints every voltmeter numeral on its tick', () => {
    expectNumeralsOnTicks('voltmeter', [10, 12, 14, 16]);
  });
});

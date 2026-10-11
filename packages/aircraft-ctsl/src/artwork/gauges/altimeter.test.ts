import { describe, it } from 'vitest';
import {
  expectLetteringClearOfSweep,
  expectNeedleOverScale,
  expectNumeralsOnTicks,
} from './test-support';

describe('CTSL altimeter gauge', () => {
  it('draws altimeter as a needle over its intake scale', () => {
    expectNeedleOverScale('altimeter', { min: 0, max: 5000 });
  });

  it('letters the face only where the needle never sweeps', () => {
    expectLetteringClearOfSweep('altimeter');
  });

  it('prints every altimeter numeral on its tick', () => {
    expectNumeralsOnTicks('altimeter', [0, 1000, 2000, 3000, 4000, 5000]);
  });
});

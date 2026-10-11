import { describe, it } from 'vitest';
import {
  expectLetteringClearOfSweep,
  expectNeedleOverScale,
  expectNumeralsOnTicks,
} from './test-support';

describe('CTSL tachometer gauge', () => {
  it('draws tachometer as a needle over its intake scale', () => {
    expectNeedleOverScale('tachometer', { min: 0, max: 7000 });
  });

  it('letters the face only where the needle never sweeps', () => {
    expectLetteringClearOfSweep('tachometer');
  });

  it('prints every tachometer numeral on its tick', () => {
    expectNumeralsOnTicks('tachometer', [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000]);
  });
});

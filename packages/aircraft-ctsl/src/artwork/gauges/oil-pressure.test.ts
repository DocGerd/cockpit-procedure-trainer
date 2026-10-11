import { describe, it } from 'vitest';
import {
  expectLetteringClearOfSweep,
  expectNeedleOverScale,
  expectNumeralsOnTicks,
} from './test-support';

describe('CTSL oil pressure gauge', () => {
  it('draws oilPressure as a needle over its intake scale', () => {
    expectNeedleOverScale('oilPressure', { min: 0, max: 10 });
  });

  it('letters the face only where the needle never sweeps', () => {
    expectLetteringClearOfSweep('oilPressure');
  });

  it('prints every oilPressure numeral on its tick', () => {
    expectNumeralsOnTicks('oilPressure', [0, 2, 4, 6, 8, 10]);
  });
});

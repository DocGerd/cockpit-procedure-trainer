import { describe, it } from 'vitest';
import {
  expectLetteringClearOfSweep,
  expectNeedleOverScale,
  expectNumeralsOnTicks,
} from './test-support';

describe('CTSL CHT gauge', () => {
  it('draws cht as a needle over its intake scale', () => {
    expectNeedleOverScale('cht', { min: 40, max: 150 });
  });

  it('letters the face only where the needle never sweeps', () => {
    expectLetteringClearOfSweep('cht');
  });

  it('prints every cht numeral on its tick', () => {
    expectNumeralsOnTicks('cht', [50, 70, 90, 110, 130, 150]);
  });
});

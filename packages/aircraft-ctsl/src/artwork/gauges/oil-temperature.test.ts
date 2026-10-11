import { describe, it } from 'vitest';
import {
  expectLetteringClearOfSweep,
  expectNeedleOverScale,
  expectNumeralsOnTicks,
} from './test-support';

describe('CTSL oil temperature gauge', () => {
  it('draws oilTemperature as a needle over its intake scale', () => {
    expectNeedleOverScale('oilTemperature', { min: 40, max: 150 });
  });

  it('letters the face only where the needle never sweeps', () => {
    expectLetteringClearOfSweep('oilTemperature');
  });

  it('prints every oilTemperature numeral on its tick', () => {
    expectNumeralsOnTicks('oilTemperature', [50, 70, 90, 110, 130, 150]);
  });
});

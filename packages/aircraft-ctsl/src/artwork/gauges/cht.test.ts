import { describe, it } from 'vitest';
import {
  expectDialFace,
  expectDialScale,
  expectNeedleReadsTemperature,
  expectPointerShape,
} from './cht-test-support';

describe('CTSL CHT gauge', () => {
  it('turns the needle by the measured two-rate scale', () => {
    expectDialScale('cht');
  });

  it('feeds the needle the linearised temperature', () => {
    expectNeedleReadsTemperature('cht');
  });

  it('prints the photographed face: numerals, ticks, green-yellow-red arcs and words', () => {
    expectDialFace({
      id: 'cht',
      words: [
        { text: '°C', y: 74 },
        { text: 'CHT', y: 160 },
      ],
      arcs: [
        { colour: 'green', from: 90, to: 110, inner: 73 },
        { colour: 'yellow', from: 110, to: 119, inner: 70 },
        { colour: 'red', from: 119.5, to: 120.5, inner: 65 },
      ],
      tintedTicks: [90, 95, 100, 105, 110, 115, 120],
    });
  });

  it('draws the short white blade with a square inner end and no tail', () => {
    expectPointerShape('cht');
  });
});

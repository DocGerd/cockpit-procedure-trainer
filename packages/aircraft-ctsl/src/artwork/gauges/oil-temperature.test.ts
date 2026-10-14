import { describe, it } from 'vitest';
import {
  expectDialFace,
  expectDialScale,
  expectNeedleReadsTemperature,
  expectPointerShape,
} from './cht-test-support';

describe('CTSL oil temperature gauge', () => {
  it('turns the needle by the same two-rate scale as the CHT', () => {
    expectDialScale('oilTemperature');
  });

  it('feeds the needle the linearised temperature', () => {
    expectNeedleReadsTemperature('oilTemperature');
  });

  it('prints the photographed face: no low yellow, green 90 to 110, yellow to 127, red to 130', () => {
    expectDialFace({
      id: 'oilTemperature',
      words: [
        { text: '°C', y: 72 },
        { text: 'OIL', y: 148 },
        { text: 'TEMP', y: 169 },
      ],
      arcs: [
        { colour: 'green', from: 90, to: 110, inner: 72 },
        { colour: 'yellow', from: 110, to: 127, inner: 68 },
        { colour: 'red', from: 127, to: 130, inner: 68 },
      ],
      tintedTicks: [90, 95, 100, 105, 110, 115],
    });
  });

  it('draws the same white blade as the CHT', () => {
    expectPointerShape('oilTemperature');
  });
});

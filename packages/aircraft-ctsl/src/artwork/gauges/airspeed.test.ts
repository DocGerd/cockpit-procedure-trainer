import { describe, expect, it } from 'vitest';
import { airspeed } from './airspeed';
import {
  expectLetteringClearOfSweep,
  expectNeedleOverScale,
  expectNumeralsOnTicks,
  readFace,
} from './test-support';

describe('CTSL airspeed gauge', () => {
  it('marks the airspeed dial with the photographed arcs and VNE 300 km/h', () => {
    const { options, artwork } = airspeed;
    expect(options).toMatchObject({ min: 40, max: 340, units: 'km/h' });
    expect(options?.['arcs']).toEqual([
      { from: 72, to: 115, colour: 'white' },
      { from: 94, to: 245, colour: 'green' },
      { from: 245, to: 300, colour: 'yellow' },
      { from: 299, to: 301, colour: 'red' },
    ]);
    const face = readFace(artwork.face);
    const labels = [...face.matchAll(/>(\d+)<\/text>/g)].map(([, value]) => Number(value));
    expect(labels).toEqual([40, 80, 120, 160, 200, 240, 280, 320]);
  });

  it('draws airspeed as a needle over its intake scale', () => {
    expectNeedleOverScale('airspeed', { min: 40, max: 340 });
  });

  it('letters the face only where the needle never sweeps', () => {
    expectLetteringClearOfSweep('airspeed');
  });

  it('prints every airspeed numeral on its tick', () => {
    expectNumeralsOnTicks('airspeed', [40, 80, 120, 160, 200, 240, 280, 320]);
  });
});

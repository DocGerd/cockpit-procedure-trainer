import { describe, expect, it } from 'vitest';
import approach from './assets/phase-approach.svg?raw';
import cruise from './assets/phase-cruise.svg?raw';
import departure from './assets/phase-departure.svg?raw';
import holding from './assets/phase-holding.svg?raw';
import landing from './assets/phase-landing.svg?raw';
import linedUp from './assets/phase-lined-up.svg?raw';
import parkingSecuring from './assets/phase-parking-securing.svg?raw';
import parking from './assets/phase-parking.svg?raw';
import taxiIn from './assets/phase-taxi-in.svg?raw';
import { phaseHeadings, runway, turn, windFromDeg } from './airfield';
import { ctslAircraft } from './index';

const views = {
  parking,
  holding,
  linedUp,
  departure,
  cruise,
  approach,
  landing,
  taxiIn,
  parkingSecuring,
};

const files: Record<keyof typeof views, string> = {
  parking: 'phase-parking.svg',
  holding: 'phase-holding.svg',
  linedUp: 'phase-lined-up.svg',
  departure: 'phase-departure.svg',
  cruise: 'phase-cruise.svg',
  approach: 'phase-approach.svg',
  landing: 'phase-landing.svg',
  taxiIn: 'phase-taxi-in.svg',
  parkingSecuring: 'phase-parking-securing.svg',
};

const angle = (degrees: number) => ((degrees % 360) + 360) % 360;
const heading = (id: string) => phaseHeadings[id as keyof typeof phaseHeadings];

const markings = (svg: string) =>
  [...svg.matchAll(/<g data-runway-designator="([^"]*)"[^>]*>(.*?)<\/g>/gs)].map(
    ([, designator, body]) => ({
      designator,
      painted: [...(body ?? '').matchAll(/<text[^>]*>([^<]*)<\/text>/g)]
        .map(([, glyph]) => glyph)
        .join(''),
    }),
  );

describe('the airfield of one flight', () => {
  it('names the runway by its heading in tens of degrees', () => {
    expect(runway.designator).toBe(String(angle(runway.headingDeg) / 10 || 36).padStart(2, '0'));
  });

  it('gives every phase exactly one heading', () => {
    expect(Object.keys(phaseHeadings).sort()).toEqual(Object.keys(ctslAircraft.phases).sort());
    for (const id of Object.keys(phaseHeadings)) expect(heading(id), id).toBeGreaterThan(0);
  });

  it('keeps every heading on the compass', () => {
    for (const [id, value] of Object.entries(phaseHeadings)) {
      expect(value, id).toBeGreaterThanOrEqual(1);
      expect(value, id).toBeLessThanOrEqual(360);
    }
    expect(turn(360, 90)).toBe(90);
    expect(turn(90, -90)).toBe(360);
  });

  it('holds short at a right angle to the runway, with the wind on the left', () => {
    expect(angle(phaseHeadings.holding - 90)).toBe(angle(runway.headingDeg));
    expect(angle(phaseHeadings.holding - windFromDeg)).toBe(90);
  });

  it.each(['linedUp', 'departure', 'approach', 'landing'])(
    'flies the %s phase on the runway heading',
    (id) => {
      expect(heading(id)).toBe(runway.headingDeg);
    },
  );

  it('flies the circuit legs at right angles to the runway', () => {
    expect(angle(phaseHeadings.cruise - runway.headingDeg) % 90).toBe(0);
  });

  it('vacates the runway to a taxiway at a right angle and parks on it', () => {
    expect([90, 270]).toContain(angle(phaseHeadings.taxiIn - runway.headingDeg));
    expect(phaseHeadings.parking).toBe(phaseHeadings.taxiIn);
    expect(phaseHeadings.parkingSecuring).toBe(phaseHeadings.taxiIn);
  });
});

describe('the runway markings in the outside views', () => {
  it('has a view for every phase', () => {
    expect(Object.keys(views).sort()).toEqual(Object.keys(ctslAircraft.phases).sort());
    for (const id of Object.keys(views)) {
      expect(ctslAircraft.phases[id]?.image, id).toContain(files[id as keyof typeof views]);
    }
  });

  it.each(Object.entries(views))('paints only the designator of the runway in %s', (_id, svg) => {
    for (const marking of markings(svg)) {
      expect(marking.designator).toBe(runway.designator);
      expect(marking.painted).toBe(runway.designator);
    }
  });

  it.each(['linedUp', 'landing'] as const)('paints the designator in the %s view', (id) => {
    expect(markings(views[id])).not.toEqual([]);
  });
});

import { createSession, STEP_MS } from '@cpt/core';
import type { TrainerState } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import approach from './assets/phase-approach.svg?raw';
import cruise from './assets/phase-cruise.svg?raw';
import departure from './assets/phase-departure.svg?raw';
import holding from './assets/phase-holding.svg?raw';
import landing from './assets/phase-landing.svg?raw';
import linedUp from './assets/phase-lined-up.svg?raw';
import parkingSecuring from './assets/phase-parking-securing.svg?raw';
import parking from './assets/phase-parking.svg?raw';
import taxiOut from './assets/phase-taxi-out.svg?raw';
import taxiIn from './assets/phase-taxi-in.svg?raw';
import { phaseHeadings, runway, turn, windFromDeg } from './airfield';
import { ctslAircraft } from './index';
import { indicators } from './indicators';
import type { CtslState } from './systems';
import { testDevices as devices } from './test-devices';

const views = {
  parking,
  taxiOut,
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
  taxiOut: 'phase-taxi-out.svg',
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
const heading = (id: string) =>
  (ctslAircraft.phases[id]?.entry.state as CtslState | undefined)?.headingDeg ?? Number.NaN;

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

  it('enters every phase facing its heading on the compass', () => {
    expect(Object.keys(phaseHeadings).sort()).toEqual(Object.keys(ctslAircraft.phases).sort());
    for (const [id, value] of Object.entries(phaseHeadings)) expect(heading(id), id).toBe(value);
    for (const id of Object.keys(ctslAircraft.phases)) {
      expect(heading(id), id).toBeGreaterThanOrEqual(1);
      expect(heading(id), id).toBeLessThanOrEqual(360);
    }
    expect(turn(360, 90)).toBe(90);
    expect(turn(90, -90)).toBe(360);
  });

  it.each(Object.keys(ctslAircraft.phases))('shows the %s heading on the compass', (id) => {
    const session = createSession(ctslAircraft, { devices, phase: id });
    session.advance(STEP_MS);
    const state = session.state() as TrainerState<CtslState>;
    expect(indicators.compass.select(state)).toBe(heading(id));
  });

  it('holds short at a right angle to the runway, with the wind on the left', () => {
    expect(angle(heading('holding') - runway.headingDeg)).toBe(90);
    expect(angle(windFromDeg - heading('holding'))).toBe(270);
  });

  it.each(['linedUp', 'departure', 'approach', 'landing'])(
    'flies the %s phase on the runway heading',
    (id) => {
      expect(heading(id)).toBe(runway.headingDeg);
    },
  );

  it('flies the downwind leg of a left-hand circuit in cruise', () => {
    expect(angle(heading('cruise') - runway.headingDeg)).toBe(180);
  });

  it('vacates the runway to a taxiway at a right angle, parks on it and taxies out along it', () => {
    expect([90, 270]).toContain(angle(heading('taxiIn') - runway.headingDeg));
    expect(heading('parking')).toBe(heading('taxiIn'));
    expect(heading('taxiOut')).toBe(heading('taxiIn'));
    expect(heading('parkingSecuring')).toBe(heading('taxiIn'));
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

import { describe, expect, it } from 'vitest';
import { gpsmap496Device } from './gpsmap496';
import type { Gpsmap496State } from './gpsmap496';
import { PAGE_NAMES, gpsmap496Readout } from './readout';

const state: Gpsmap496State = {
  ...(gpsmap496Device.initial as Gpsmap496State),
  on: true,
  page: 'terrain',
  backlight: 2,
};
const fixed: Gpsmap496State = { ...state, fix: true, groundSpeedKt: 107.6, trackDeg: 180 };

describe('gpsmap496Readout', () => {
  it('reads out the page, that it is acquiring satellites, and the backlight level', () => {
    expect(gpsmap496Readout(state, 'en', true)).toBe(
      'Terrain page, acquiring satellites, backlight 3 of 3',
    );
    expect(gpsmap496Readout(state, 'de', true)).toBe(
      'Seite Gelände, Satellitensuche, Beleuchtung 3 von 3',
    );
  });

  it('reads out the fix on every page', () => {
    expect(gpsmap496Readout(fixed, 'en', true)).toBe(
      'Terrain page, position fix, backlight 3 of 3',
    );
    expect(gpsmap496Readout(fixed, 'de', true)).toBe(
      'Seite Gelände, Position bestimmt, Beleuchtung 3 von 3',
    );
  });

  it('reads out ground speed and track on the map page', () => {
    const map = { ...fixed, page: 'map' } as const;
    expect(gpsmap496Readout(map, 'en', true)).toBe(
      'Map page, position fix, ground speed 108 knots, track 180 degrees, backlight 3 of 3',
    );
    expect(gpsmap496Readout(map, 'de', true)).toBe(
      'Seite Karte, Position bestimmt, Fahrt über Grund 108 Knoten, Kurs über Grund 180 Grad, Beleuchtung 3 von 3',
    );
  });

  it('leaves out a reading the receiver does not have', () => {
    const map = { ...fixed, page: 'map', groundSpeedKt: null, trackDeg: null } as const;
    expect(gpsmap496Readout(map, 'en', true)).toBe('Map page, position fix, backlight 3 of 3');
    expect(gpsmap496Readout(map, 'de', true)).toBe(
      'Seite Karte, Position bestimmt, Beleuchtung 3 von 3',
    );
  });

  it('names every page in both languages', () => {
    for (const page of ['map', 'terrain', 'route', 'info'] as const) {
      expect(gpsmap496Readout({ ...state, page }, 'en', true)).toContain(PAGE_NAMES[page].en);
      expect(gpsmap496Readout({ ...state, page }, 'de', true)).toContain(PAGE_NAMES[page].de);
    }
  });

  it('reads out an unpowered receiver, and a dark one, as off', () => {
    expect(gpsmap496Readout({ ...state, on: false }, 'en', true)).toBe('Off');
    expect(gpsmap496Readout(state, 'en', false)).toBe('Off');
    expect(gpsmap496Readout(state, 'de', false)).toBe('Aus');
  });
});

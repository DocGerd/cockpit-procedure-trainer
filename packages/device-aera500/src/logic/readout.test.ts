import { describe, expect, it } from 'vitest';
import { PAGES, RANGES_NM, aera500Device } from './aera500';
import type { Aera500State } from './aera500';
import { aera500Readout } from './readout';

const lit: Aera500State = { ...(aera500Device.initial as Aera500State), on: true };
const fixed: Aera500State = {
  ...lit,
  page: 'map',
  fix: true,
  groundSpeedKt: 61.4,
  trackDeg: 270,
  altitudeFt: 2400,
};

describe('aera500Readout', () => {
  it('reads Off in both languages when the unit is dark', () => {
    expect(aera500Readout(lit, 'en', false)).toBe('Off');
    expect(aera500Readout(lit, 'de', false)).toBe('Aus');
    expect(aera500Readout({ ...lit, on: false }, 'en', true)).toBe('Off');
    expect(aera500Readout({ ...lit, on: false }, 'de', true)).toBe('Aus');
  });

  it('names every page in both languages', () => {
    for (const page of PAGES) {
      const en = aera500Readout({ ...lit, page }, 'en', true);
      const de = aera500Readout({ ...lit, page }, 'de', true);
      expect(en, page).not.toBe(de);
      expect(en.trim(), page).not.toBe('');
    }
  });

  it('asks for the acceptance at the start-up page', () => {
    expect(aera500Readout(lit, 'en', true)).toContain('Press To Accept');
    expect(aera500Readout(lit, 'de', true)).toContain('Press To Accept');
  });

  it('reads the map with range, ground speed and track', () => {
    expect(aera500Readout(fixed, 'en', true)).toBe(
      'Map page, range 5 nautical miles, ground speed 61 knots, track 270 degrees',
    );
    expect(aera500Readout(fixed, 'de', true)).toBe(
      'Kartenseite, Reichweite 5 Seemeilen, Fahrt über Grund 61 Knoten, Kurs 270 Grad',
    );
  });

  it('says there is no position without a fix', () => {
    const map = { ...lit, page: 'map' } as const;
    expect(aera500Readout(map, 'en', true)).toContain('no position');
    expect(aera500Readout(map, 'de', true)).toContain('keine Position');
  });

  it('follows the range step', () => {
    const wide = { ...fixed, rangeIndex: RANGES_NM.indexOf(50) };
    expect(aera500Readout(wide, 'en', true)).toContain('range 50 nautical miles');
  });

  it('reads the receiver status on the GPS Status page', () => {
    const status = { ...lit, page: 'gpsStatus' } as const;
    expect(aera500Readout(status, 'en', true)).toContain('Searching the Sky');
    expect(aera500Readout({ ...status, acquiringMs: 15_000 }, 'en', true)).toContain(
      'Acquiring Satellites',
    );
    expect(aera500Readout({ ...status, fix: true }, 'en', true)).toContain('3D GPS Location');
  });

  it('reads the GPS altitude on the Position page', () => {
    const position = { ...fixed, page: 'position' } as const;
    expect(aera500Readout(position, 'en', true)).toContain('altitude 2400 feet');
    expect(aera500Readout(position, 'de', true)).toContain('Höhe 2400 Fuß');
  });

  it('reads the backlight level while the overlay is open', () => {
    const overlay = { ...fixed, overlay: true, backlight: 7 };
    expect(aera500Readout(overlay, 'en', true)).toBe('backlight 7 of 10');
    expect(aera500Readout(overlay, 'de', true)).toBe('Beleuchtung 7 von 10');
  });

  it('leaves the backlight out of the reading with the overlay closed', () => {
    expect(aera500Readout(fixed, 'en', true)).not.toContain('backlight');
  });
});

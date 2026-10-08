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

describe('gpsmap496Readout', () => {
  it('reads out the page, that there is no position, and the backlight level', () => {
    expect(gpsmap496Readout(state, 'en', true)).toBe('Terrain page, no position, backlight 3 of 3');
    expect(gpsmap496Readout(state, 'de', true)).toBe(
      'Seite Gelände, keine Position, Beleuchtung 3 von 3',
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

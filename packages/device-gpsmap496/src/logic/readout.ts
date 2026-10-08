import type { Text } from '@cpt/core';
import { BACKLIGHT_LEVELS } from './gpsmap496';
import type { Gpsmap496Page, Gpsmap496State } from './gpsmap496';

/** Page names as the receiver prints them (English) and as a spoken readout says them. */
export const PAGE_NAMES: Readonly<Record<Gpsmap496Page, Text>> = {
  map: { en: 'Map', de: 'Karte' },
  terrain: { en: 'Terrain', de: 'Gelände' },
  route: { en: 'Active route', de: 'Aktive Route' },
  info: { en: 'Information', de: 'Informationen' },
};

export function gpsmap496Readout(state: unknown, language: keyof Text, on: boolean): string {
  const unit = state as Gpsmap496State;
  const de = language === 'de';
  if (!on || !unit.on) return de ? 'Aus' : 'Off';
  const page = PAGE_NAMES[unit.page][language];
  const level = unit.backlight + 1;
  const map = unit.page === 'map';
  const speed = map && unit.groundSpeedKt !== null ? Math.round(unit.groundSpeedKt) : null;
  const track = map && unit.trackDeg !== null ? Math.round(unit.trackDeg) : null;
  const parts = de
    ? [
        `Seite ${page}`,
        unit.fix ? 'Position bestimmt' : 'Satellitensuche',
        speed === null ? null : `Fahrt über Grund ${speed} Knoten`,
        track === null ? null : `Kurs über Grund ${track} Grad`,
        `Beleuchtung ${level} von ${BACKLIGHT_LEVELS}`,
      ]
    : [
        `${page} page`,
        unit.fix ? 'position fix' : 'acquiring satellites',
        speed === null ? null : `ground speed ${speed} knots`,
        track === null ? null : `track ${track} degrees`,
        `backlight ${level} of ${BACKLIGHT_LEVELS}`,
      ];
  return parts.filter((part) => part !== null).join(', ');
}

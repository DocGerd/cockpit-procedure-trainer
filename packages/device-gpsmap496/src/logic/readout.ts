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
  return de
    ? `Seite ${page}, keine Position, Beleuchtung ${level} von ${BACKLIGHT_LEVELS}`
    : `${page} page, no position, backlight ${level} of ${BACKLIGHT_LEVELS}`;
}

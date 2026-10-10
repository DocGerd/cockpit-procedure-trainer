import type { Text } from '@cpt/core';
import { BACKLIGHT_MAX, RANGES_NM, receiverStatus } from './aera500';
import type { Aera500Page, Aera500State, ReceiverStatus } from './aera500';

/** Page names as a spoken readout says them. */
export const PAGE_NAMES: Readonly<Record<Aera500Page, Text>> = {
  startup: { en: 'Start-up page', de: 'Startseite' },
  home: { en: 'Home page', de: 'Home-Seite' },
  map: { en: 'Map page', de: 'Kartenseite' },
  nearest: { en: 'Nearest page', de: 'Seite Nearest' },
  activeFpl: { en: 'Active FPL page', de: 'Seite Active FPL' },
  directTo: { en: 'Direct To page', de: 'Seite Direct To' },
  position: { en: 'Position page', de: 'Seite Position' },
  tools: { en: 'Tools page', de: 'Seite Tools' },
  gpsStatus: { en: 'GPS Status page', de: 'Seite GPS Status' },
};

/** The receiver's status text as the unit prints it, in English. */
export const STATUS_NAMES: Readonly<Record<ReceiverStatus, string>> = {
  searching: 'Searching the Sky',
  acquiring: 'Acquiring Satellites',
  fix: '3D GPS Location',
};

const rounded = (value: number | null): number | null =>
  value === null ? null : Math.round(value);

export function aera500Readout(state: unknown, language: keyof Text, on: boolean): string {
  const unit = state as Aera500State;
  const de = language === 'de';
  if (!on || !unit.on) return de ? 'Aus' : 'Off';

  if (unit.overlay) {
    return de
      ? `Beleuchtung ${unit.backlight} von ${BACKLIGHT_MAX}`
      : `backlight ${unit.backlight} of ${BACKLIGHT_MAX}`;
  }

  const parts: (string | null)[] = [PAGE_NAMES[unit.page][language]];
  const range = RANGES_NM[unit.rangeIndex];
  const speed = rounded(unit.groundSpeedKt);
  const track = rounded(unit.trackDeg);
  const altitude = rounded(unit.altitudeFt);
  switch (unit.page) {
    case 'startup':
      parts.push(
        de ? 'Datenbanken bestätigen: Press To Accept' : 'accept databases: Press To Accept',
      );
      break;
    case 'home':
    case 'gpsStatus':
      parts.push(STATUS_NAMES[receiverStatus(unit)]);
      break;
    case 'map':
      parts.push(
        de ? `Reichweite ${range} Seemeilen` : `range ${range} nautical miles`,
        unit.fix ? null : de ? 'keine Position' : 'no position',
        speed === null
          ? null
          : de
            ? `Fahrt über Grund ${speed} Knoten`
            : `ground speed ${speed} knots`,
        track === null ? null : de ? `Kurs ${track} Grad` : `track ${track} degrees`,
      );
      break;
    case 'position':
      parts.push(
        altitude === null
          ? de
            ? 'keine Höhe'
            : 'no altitude'
          : de
            ? `Höhe ${altitude} Fuß`
            : `altitude ${altitude} feet`,
      );
      break;
    case 'activeFpl':
      parts.push(de ? 'kein Flugplan' : 'no flight plan');
      break;
    case 'directTo':
      parts.push(de ? 'Suche nach Kennung, Name oder Ort' : 'search by identifier, name or city');
      break;
    case 'tools':
      parts.push(de ? 'Eintrag GPS Status' : 'GPS Status entry');
      break;
    case 'nearest':
      parts.push(de ? 'keine Einträge' : 'no entries');
      break;
  }
  return parts.filter((part) => part !== null).join(', ');
}

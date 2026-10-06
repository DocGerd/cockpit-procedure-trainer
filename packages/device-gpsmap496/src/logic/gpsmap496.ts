import { defineDevice } from '@cpt/core';
import type { Text } from '@cpt/core';

export const PAGES = ['map', 'terrain', 'route', 'info'] as const;
export type Gpsmap496Page = (typeof PAGES)[number];

export const KEYS = ['power', 'backlight', 'page', 'quit'] as const;
export type Gpsmap496Key = (typeof KEYS)[number];

export const BACKLIGHT_LEVELS = 3;

export type Gpsmap496State = {
  readonly on: boolean;
  readonly page: Gpsmap496Page;
  readonly backlight: number;
  readonly held: Readonly<Record<Gpsmap496Key, string>>;
};

const text = (de: string, en: string): Text => ({ de, en });

const key = (name: Text, description: Text) =>
  ({
    kind: 'momentary',
    positions: ['released', 'pressed'],
    initial: 'released',
    name,
    description,
  }) as const;

const initial: Gpsmap496State = {
  on: false,
  page: 'map',
  backlight: 1,
  held: { power: 'released', backlight: 'released', page: 'released', quit: 'released' },
};

const shift = (page: Gpsmap496Page, by: number): Gpsmap496Page =>
  PAGES[(PAGES.indexOf(page) + by + PAGES.length) % PAGES.length] ?? page;

export const gpsmap496Device = defineDevice({
  id: 'gpsmap496',
  manual: text(
    'Garmin GPSMAP 496, Bedienung nach allgemeinem Wissen über Garmin-Handgeräte; Revision des Handbuchs nicht ermittelt',
    'Garmin GPSMAP 496, operation from general knowledge of Garmin handheld GPS units; manual revision not identified',
  ),
  notModelled: [
    text('Karte, Kartendarstellung und Zoom', 'Moving map, map display and zoom'),
    text(
      'Satellitenempfang, Position, Kurs und Geschwindigkeit',
      'Satellite reception, position, track and speed',
    ),
    text(
      'Navigationsdatenbank, Flughäfen und Luftraum',
      'Navigation database, airports and airspace',
    ),
    text(
      'Direkt-zu, Routen, nächste Flugplätze und Wegpunkte',
      'Direct-to, routes, nearest airports and waypoints',
    ),
    text('Wetter-, Gelände- und Verkehrsdaten', 'Weather, terrain and traffic data'),
    text('Audioausgabe und Warnungen', 'Audio output and alerts'),
    text(
      'Menüs, Einstellungen, Eingabetaste und Steuerkreuz',
      'Menus, settings, enter key and rocker',
    ),
    text('Interner Akku und Ladeanzeige', 'Internal battery and charge indication'),
    text(
      'Gerätestart mit Ansage- und Bestätigungsseiten',
      'Start-up with splash and acknowledgement pages',
    ),
  ],
  controls: {
    power: key(
      text('Ein/Aus', 'Power'),
      text('Schaltet das Gerät ein oder aus.', 'Switches the unit on or off.'),
    ),
    backlight: key(
      text('Beleuchtung', 'Backlight'),
      text('Schaltet die Bildschirmhelligkeit weiter.', 'Steps the screen backlight level.'),
    ),
    page: key(
      text('Seite', 'Page'),
      text('Zeigt die nächste Hauptseite.', 'Shows the next main page.'),
    ),
    quit: key(
      text('Zurück', 'Quit'),
      text('Zeigt die vorige Hauptseite.', 'Shows the previous main page.'),
    ),
  },
  initial,
  step(state: Gpsmap496State, { controls, powered }): Gpsmap496State {
    const held = Object.fromEntries(KEYS.map((id) => [id, String(controls[id])])) as Record<
      Gpsmap496Key,
      string
    >;
    if (!powered) return { ...state, on: false, page: 'map', held };

    const tapped = (id: Gpsmap496Key): boolean =>
      held[id] === 'pressed' && state.held[id] !== 'pressed';

    let { on, page, backlight } = state;
    if (tapped('power')) on = !on;
    if (!on) return { ...state, on, page: 'map', held };

    if (tapped('page')) page = shift(page, 1);
    if (tapped('quit')) page = shift(page, -1);
    if (tapped('backlight')) backlight = (backlight + 1) % BACKLIGHT_LEVELS;
    return { on, page, backlight, held };
  },
});

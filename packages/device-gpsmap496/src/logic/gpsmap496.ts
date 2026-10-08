import { defineDevice } from '@cpt/core';
import type { IndicatorValue, Text } from '@cpt/core';

export const PAGES = ['map', 'terrain', 'route', 'info'] as const;
export type Gpsmap496Page = (typeof PAGES)[number];

export const KEYS = ['power', 'backlight', 'page', 'quit'] as const;
export type Gpsmap496Key = (typeof KEYS)[number];

export const BACKLIGHT_LEVELS = 3;

export const GROUND_SPEED_INPUT = 'groundSpeedKt';
export const TRACK_INPUT = 'trackDeg';

/** How long the receiver searches for satellites after it is switched on. */
export const ACQUIRE_MS = 30_000;

export type Gpsmap496State = {
  readonly on: boolean;
  readonly page: Gpsmap496Page;
  readonly backlight: number;
  readonly fix: boolean;
  readonly acquiringMs: number;
  readonly groundSpeedKt: number | null;
  readonly trackDeg: number | null;
  readonly held: Readonly<Record<Gpsmap496Key, string>>;
};

const text = (de: string, en: string): Text => ({ de, en });

// The unit prints no word for a key at rest or pressed, so cues name both in words.
const keyLegends = {
  released: {
    state: text('losgelassen', 'released'),
    restore: text('Wieder loslassen', 'Release it'),
  },
  pressed: {
    state: text('gedrückt', 'pressed'),
    restore: text('Wieder drücken', 'Press it again'),
  },
} as const;

const key = (name: Text, description: Text) =>
  ({
    kind: 'momentary',
    positions: ['released', 'pressed'],
    initial: 'released',
    legends: keyLegends,
    name,
    description,
  }) as const;

const initial: Gpsmap496State = {
  on: false,
  page: 'map',
  backlight: 1,
  fix: false,
  acquiringMs: 0,
  groundSpeedKt: null,
  trackDeg: null,
  held: { power: 'released', backlight: 'released', page: 'released', quit: 'released' },
};

const noFix = { fix: false, acquiringMs: 0, groundSpeedKt: null, trackDeg: null } as const;

const reading = (value: IndicatorValue | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const shift = (page: Gpsmap496Page, by: number): Gpsmap496Page =>
  PAGES[(PAGES.indexOf(page) + by + PAGES.length) % PAGES.length] ?? page;

export const gpsmap496Device = defineDevice({
  id: 'gpsmap496',
  manual: text(
    'Garmin GPSMAP 496, Bedienung nach allgemeinem Wissen über Garmin-Handgeräte; Revision des Handbuchs nicht ermittelt',
    'Garmin GPSMAP 496, operation from general knowledge of Garmin handheld GPS units; manual revision not identified',
  ),
  notModelled: [
    text(
      'Kartendaten, Zoom und Kartenausrichtung: die Karte zeigt nur Entfernungsringe, Kurslinie und Nordrichtung',
      'Map data, zoom and map orientation: the map shows only range rings, the track line and north',
    ),
    text(
      'Satellitenkonstellation, Signalstärke, Koordinaten und GPS-Höhe; die Position steht nach einer festen Suchzeit',
      'Satellite constellation, signal strength, coordinates and GPS altitude; the fix comes after a fixed search time',
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
  step(state: Gpsmap496State, { controls, powered, inputs, dtMs }): Gpsmap496State {
    const held = Object.fromEntries(KEYS.map((id) => [id, String(controls[id])])) as Record<
      Gpsmap496Key,
      string
    >;
    if (!powered) return { ...state, ...noFix, on: false, page: 'map', held };

    const tapped = (id: Gpsmap496Key): boolean =>
      held[id] === 'pressed' && state.held[id] !== 'pressed';

    let { on, page, backlight } = state;
    if (tapped('power')) on = !on;
    if (!on) return { ...state, ...noFix, on, page: 'map', held };

    if (tapped('page')) page = shift(page, 1);
    if (tapped('quit')) page = shift(page, -1);
    if (tapped('backlight')) backlight = (backlight + 1) % BACKLIGHT_LEVELS;

    const acquiringMs = Math.min(ACQUIRE_MS, state.acquiringMs + dtMs);
    const fix = state.fix || acquiringMs >= ACQUIRE_MS;
    return {
      on,
      page,
      backlight,
      fix,
      acquiringMs,
      groundSpeedKt: fix ? reading(inputs[GROUND_SPEED_INPUT]) : null,
      trackDeg: fix ? reading(inputs[TRACK_INPUT]) : null,
      held,
    };
  },
});

import { defineDevice } from '@cpt/core';
import type { IndicatorValue, Text } from '@cpt/core';

export const PAGES = [
  'startup',
  'home',
  'map',
  'nearest',
  'activeFpl',
  'directTo',
  'position',
  'tools',
  'gpsStatus',
] as const;
export type Aera500Page = (typeof PAGES)[number];

export const TOUCH_ICONS = [
  'accept',
  'home',
  'back',
  'map',
  'nearest',
  'activeFpl',
  'directTo',
  'position',
  'tools',
  'gpsStatus',
  'zoomOut',
  'zoomIn',
  'dimmer',
  'brighter',
] as const;
export type TouchIcon = (typeof TOUCH_ICONS)[number];

export const GROUND_SPEED_INPUT = 'groundSpeedKt';
export const TRACK_INPUT = 'trackDeg';
export const ALTITUDE_INPUT = 'altitudeFt';

/** Map ranges in nautical miles, a subset of the unit's steps. */
export const RANGES_NM = [0.5, 1, 2, 5, 10, 20, 50] as const;

export const BACKLIGHT_MIN = 1;
export const BACKLIGHT_MAX = 10;

/** How long POWER is held to switch the unit off. */
export const POWER_OFF_HOLD_MS = 2_000;

/** How long the receiver searches for satellites after the unit is switched on. */
export const ACQUIRE_MS = 30_000;

export type Aera500Held = { readonly power: string; readonly touch: string };

export type Aera500State = {
  readonly on: boolean;
  readonly powered: boolean;
  readonly page: Aera500Page;
  readonly overlay: boolean;
  readonly backlight: number;
  readonly rangeIndex: number;
  readonly fix: boolean;
  readonly acquiringMs: number;
  readonly groundSpeedKt: number | null;
  readonly trackDeg: number | null;
  readonly altitudeFt: number | null;
  readonly held: Aera500Held;
  readonly heldMs: number;
};

export type ReceiverStatus = 'searching' | 'acquiring' | 'fix';

/** The receiver's status text: searching for the first third of the search, then acquiring. */
export function receiverStatus(state: Pick<Aera500State, 'fix' | 'acquiringMs'>): ReceiverStatus {
  if (state.fix) return 'fix';
  return state.acquiringMs < ACQUIRE_MS / 3 ? 'searching' : 'acquiring';
}

const text = (de: string, en: string): Text => ({ de, en });

// The unit prints no word for its button at rest or pressed, so cues name both in words.
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

// An icon is named as the screen prints it; only the screen at rest has no name.
const touchLegends = {
  rest: { state: text('losgelassen', 'released'), restore: text('Wieder loslassen', 'Release it') },
  accept: 'Press To Accept',
  home: 'Home',
  back: 'Back',
  map: 'Map',
  nearest: 'Nearest',
  activeFpl: 'Active FPL',
  directTo: 'Direct To',
  position: 'Position',
  tools: 'Tools',
  gpsStatus: 'GPS Status',
  zoomOut: 'Out',
  zoomIn: 'In',
  dimmer: '−',
  brighter: '+',
} as const satisfies Record<'rest' | TouchIcon, unknown>;

const springBack = Object.fromEntries(TOUCH_ICONS.map((icon) => [icon, 'rest'])) as Record<
  TouchIcon,
  'rest'
>;

const initial: Aera500State = {
  on: false,
  powered: false,
  page: 'startup',
  overlay: false,
  backlight: BACKLIGHT_MAX,
  rangeIndex: RANGES_NM.indexOf(5),
  fix: false,
  acquiringMs: 0,
  groundSpeedKt: null,
  trackDeg: null,
  altitudeFt: null,
  held: { power: 'released', touch: 'rest' },
  heldMs: 0,
};

// The unit's own state after switching on or off; the pilot's settings stay.
const switchedOn = {
  on: true,
  page: 'startup',
  overlay: false,
  fix: false,
  acquiringMs: 0,
  groundSpeedKt: null,
  trackDeg: null,
  altitudeFt: null,
} as const;
const switchedOff = { ...switchedOn, on: false } as const;

// Where each page's icons lead; zoom and the overlay icons are not page changes.
const NAVIGATION: Readonly<Record<Aera500Page, Partial<Record<TouchIcon, Aera500Page>>>> = {
  startup: { accept: 'home' },
  home: {
    map: 'map',
    nearest: 'nearest',
    activeFpl: 'activeFpl',
    directTo: 'directTo',
    position: 'position',
    tools: 'tools',
  },
  map: { home: 'home' },
  nearest: { home: 'home', back: 'home' },
  activeFpl: { home: 'home', back: 'home' },
  directTo: { home: 'home', back: 'home' },
  position: { home: 'home', back: 'home' },
  tools: { home: 'home', back: 'home', gpsStatus: 'gpsStatus' },
  gpsStatus: { home: 'home', back: 'tools' },
};

/** The icons each page offers, in the order its keys are laid out. */
export const PAGE_ICONS: Readonly<Record<Aera500Page, readonly TouchIcon[]>> = {
  startup: ['accept'],
  home: ['map', 'nearest', 'activeFpl', 'directTo', 'position', 'tools'],
  map: ['home', 'zoomOut', 'zoomIn'],
  nearest: ['back', 'home'],
  activeFpl: ['back', 'home'],
  directTo: ['back', 'home'],
  position: ['back', 'home'],
  tools: ['back', 'home', 'gpsStatus'],
  gpsStatus: ['back', 'home'],
};

export const OVERLAY_ICONS: readonly TouchIcon[] = ['dimmer', 'brighter'];

/** The icons on screen: the backlight overlay hides the page's own. */
export const shownIcons = (state: Pick<Aera500State, 'page' | 'overlay'>): readonly TouchIcon[] =>
  state.overlay ? OVERLAY_ICONS : PAGE_ICONS[state.page];

const reading = (value: IndicatorValue | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const notModelled = [
  text(
    'Die Navigationsdatenbank (Flugplätze, Funkfeuer, Luftraum): Nearest, Direct To und Active FPL bleiben leer, Kennungen werden nicht eingegeben',
    'The navigation database (airports, navaids, airspace), so Nearest, Direct To and Active FPL stay empty and identifier entry is not modelled',
  ),
  text(
    'Kartendaten, Gelände, Hindernisse, Wetter, Verkehr und XM sowie ihre Seiten (Terrain, HSI/Panel, Traffic, Weather, WPT Info, Numbers)',
    'Map data, terrain, obstacles, weather, traffic and XM, and their pages (Terrain, HSI/Panel, Traffic, Weather, WPT Info, Numbers)',
  ),
  text(
    'Kartenzeiger, Verschieben, Seitenmenüs (Menu-Symbol) und Karteneinstellungen (die Ausrichtung ist fest Track Up)',
    'The map pointer, panning, page menus (Menu icon) and map settings (orientation fixed track up)',
  ),
  text(
    'Himmelsansicht der Satelliten, Breite und Länge sowie der Bezugswegpunkt',
    'The satellite sky view, latitude and longitude and the reference waypoint',
  ),
  text(
    'Flugpläne, Direct-To-Führung, VNAV, Alarme und Meldungsfenster',
    'Flight plans, Direct-To guidance, VNAV, alarms and message pop-ups',
  ),
  text('Tools außer GPS Status sowie die Einstellungen', 'Tools other than GPS Status, and setup'),
  text('Ton und Lautstärke', 'Sound and volume'),
  text(
    'Der Akku, der Lademodus und die Warnung bei Stromausfall',
    'The battery, Charge Mode and the power-loss warning',
  ),
  text('Datenbankdaten und Zyklen', 'Database dates and cycles'),
  text('Automobil- und Simulatormodus', 'Automotive and simulator modes'),
  text('Kalibrierung des Touchscreens', 'Touchscreen calibration'),
  text(
    'Bildschirmabdunklung (die Helligkeit erscheint nur im Overlay)',
    'Screen dimming (the backlight level shows in its overlay only)',
  ),
];

export const aera500Device = defineDevice({
  id: 'aera500',
  manual: text(
    'Garmin aera 500 Series Pilot’s Guide, Dokument 190-01117-02, Revision C, Systemsoftware 4.10 oder neuer (Abschnitt 3.8.3 der CTSL-Aufnahme)',
    'Garmin aera 500 Series Pilot’s Guide, document 190-01117-02, revision C, system software 4.10 or later (CTSL intake §3.8.3)',
  ),
  notModelled,
  controls: {
    power: {
      kind: 'momentary',
      positions: ['released', 'pressed'],
      initial: 'released',
      legends: keyLegends,
      name: text('Ein/Aus-Taste', 'Power button'),
      description: text(
        'Schaltet das Gerät ein; eingeschaltet öffnet ein kurzer Druck die Helligkeitsanzeige, langes Halten schaltet aus.',
        'Switches the unit on; when on, a short press opens the backlight overlay and a long hold switches it off.',
      ),
    },
    touch: {
      kind: 'rotary',
      positions: ['rest', ...TOUCH_ICONS],
      initial: 'rest',
      springBack,
      legends: touchLegends,
      name: text('Touchscreen', 'Touchscreen'),
      description: text(
        'Berührt ein Symbol der aktuellen Seite.',
        'Touches an icon of the page on screen.',
      ),
    },
  },
  initial,
  step(state: Aera500State, { controls, powered, inputs, dtMs }): Aera500State {
    const held: Aera500Held = { power: String(controls.power), touch: String(controls.touch) };
    const down = held.power === 'pressed';

    if (!powered) {
      return { ...state, ...switchedOff, powered: false, heldMs: 0, held };
    }
    // A key held while the unit switches on is spent, so its release opens nothing.
    const spent = down ? POWER_OFF_HOLD_MS : 0;
    if (!state.powered) return { ...state, ...switchedOn, powered: true, heldMs: spent, held };
    if (!state.on) {
      if (down && state.held.power !== 'pressed') {
        return { ...state, ...switchedOn, heldMs: POWER_OFF_HOLD_MS, held };
      }
      return { ...state, heldMs: spent, held };
    }

    const heldMs = down ? Math.min(POWER_OFF_HOLD_MS, state.heldMs + dtMs) : 0;
    if (down && state.heldMs < POWER_OFF_HOLD_MS && heldMs >= POWER_OFF_HOLD_MS) {
      return { ...state, ...switchedOff, heldMs, held };
    }
    const released = !down && state.held.power === 'pressed' && state.heldMs < POWER_OFF_HOLD_MS;
    const overlay = released ? !state.overlay : state.overlay;

    let { page, backlight, rangeIndex } = state;
    const icon = held.touch as TouchIcon | 'rest';
    if (icon !== 'rest' && icon !== state.held.touch) {
      if (state.overlay) {
        if (icon === 'dimmer') backlight = clamp(backlight - 1, BACKLIGHT_MIN, BACKLIGHT_MAX);
        if (icon === 'brighter') backlight = clamp(backlight + 1, BACKLIGHT_MIN, BACKLIGHT_MAX);
      } else {
        page = (PAGE_ICONS[page].includes(icon) ? NAVIGATION[page][icon] : undefined) ?? page;
        const zoom = icon === 'zoomOut' ? 1 : icon === 'zoomIn' ? -1 : 0;
        if (state.page === 'map' && PAGE_ICONS.map.includes(icon))
          rangeIndex = clamp(rangeIndex + zoom, 0, RANGES_NM.length - 1);
      }
    }

    const acquiringMs = Math.min(ACQUIRE_MS, state.acquiringMs + dtMs);
    const fix = state.fix || acquiringMs >= ACQUIRE_MS;
    return {
      on: true,
      powered: true,
      page,
      overlay,
      backlight,
      rangeIndex,
      fix,
      acquiringMs,
      groundSpeedKt: fix ? reading(inputs[GROUND_SPEED_INPUT]) : null,
      trackDeg: fix ? reading(inputs[TRACK_INPUT]) : null,
      altitudeFt: fix ? reading(inputs[ALTITUDE_INPUT]) : null,
      held,
      heldMs,
    };
  },
});

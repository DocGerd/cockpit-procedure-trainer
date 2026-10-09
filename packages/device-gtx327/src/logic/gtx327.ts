import { defineDevice } from '@cpt/core';
import type { Text } from '@cpt/core';

export const MODES = ['off', 'sby', 'tst', 'gnd', 'on', 'alt'] as const;
export type Gtx327Mode = (typeof MODES)[number];

export const PAGES = ['altitude', 'countUp'] as const;
export type Gtx327Page = (typeof PAGES)[number];

export const DIGIT_KEYS = ['key0', 'key1', 'key2', 'key3', 'key4', 'key5', 'key6', 'key7'] as const;

export const IDENT_DURATION_MS = 18_000;
export const PRESSURE_ALTITUDE_INPUT = 'pressureAltitude';
export const VFR_CODE = '7000';

const CODE_LENGTH = 4;
const KEYS = [...DIGIT_KEYS, 'clr', 'crsr', 'vfr', 'ident', 'func', 'startStop'] as const;
type Key = (typeof KEYS)[number];

export type Gtx327State = {
  readonly mode: Gtx327Mode;
  readonly squawk: string;
  readonly entry: string;
  readonly altitude: number | null;
  readonly reporting: boolean;
  readonly ident: boolean;
  readonly identRemainingMs: number;
  readonly page: Gtx327Page;
  readonly timerMs: number;
  readonly timerRunning: boolean;
  readonly held: Readonly<Record<Key, string>>;
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

const isMode = (value: unknown): value is Gtx327Mode => MODES.some((mode) => mode === value);

const restingKeys = (): Record<Key, string> =>
  Object.fromEntries(KEYS.map((id) => [id, 'released'])) as Record<Key, string>;

const key = (name: Text, description: Text) =>
  ({
    kind: 'momentary',
    positions: ['released', 'pressed'],
    initial: 'released',
    legends: keyLegends,
    name,
    description,
  }) as const;

const digit = (index: number) =>
  key(
    text(`Ziffer ${index}`, `Digit ${index}`),
    text(
      `Gibt die Ziffer ${index} des Transpondercodes ein.`,
      `Enters the digit ${index} of the code.`,
    ),
  );

const initial: Gtx327State = {
  mode: 'off',
  squawk: '2000',
  entry: '',
  altitude: null,
  reporting: false,
  ident: false,
  identRemainingMs: 0,
  page: 'altitude',
  timerMs: 0,
  timerRunning: false,
  held: restingKeys(),
};

export const gtx327Device = defineDevice({
  id: 'gtx327',
  manual: text(
    'Garmin GTX 327, Bedienung nach allgemeinem Wissen über Mode-A/C-Transponder; Revision des Handbuchs nicht ermittelt',
    'Garmin GTX 327, operation from general knowledge of Mode A/C transponders; manual revision not identified',
  ),
  notModelled: [
    text('Abfragen und Antworten, Antwortanzeige', 'Interrogation and replies, reply annunciation'),
    text(
      'Flugzeit, Rückwärts-Timer und Höhenüberwachung',
      'Flight time, countdown timer and altitude monitor',
    ),
    text('Helligkeit, Kontrast und Beleuchtung', 'Brightness, contrast and display lighting'),
    text(
      'Höhenausgabe in Schritten und Höhenkorrektur',
      'Altitude reporting increments and altitude correction',
    ),
    text('Selbsttest-Ergebnisse und Fehlermeldungen', 'Self-test results and fault messages'),
    text(
      'Konfiguration des VFR-Codes durch den Einbaubetrieb',
      'Installer configuration of the VFR code',
    ),
    text('Zeitablauf einer halb eingegebenen Codeeingabe', 'Time-out of a half-typed code'),
  ],
  controls: {
    mode: {
      kind: 'rotary',
      positions: MODES,
      initial: 'off',
      name: text('Betriebsart', 'Mode'),
      description: text(
        'Wählt AUS, Bereitschaft, Test, Boden, EIN oder Höhe.',
        'Selects off, standby, test, ground, on or altitude.',
      ),
    },
    key0: digit(0),
    key1: digit(1),
    key2: digit(2),
    key3: digit(3),
    key4: digit(4),
    key5: digit(5),
    key6: digit(6),
    key7: digit(7),
    clr: key(
      text('Löschen', 'Clear'),
      text(
        'Löscht die zuletzt eingegebene Ziffer oder setzt den gestoppten Timer zurück.',
        'Deletes the last typed digit, or resets the stopped timer.',
      ),
    ),
    crsr: key(
      text('Cursor', 'Cursor'),
      text('Bricht die Codeeingabe ab.', 'Cancels the code entry.'),
    ),
    vfr: key(text('VFR', 'VFR'), text('Setzt den VFR-Code.', 'Sets the VFR code.')),
    ident: key(
      text('Ident', 'Ident'),
      text('Löst die zeitlich begrenzte Identifizierung aus.', 'Starts the timed identification.'),
    ),
    func: key(
      text('Funktion', 'Function'),
      text('Schaltet zwischen den Funktionsseiten um.', 'Cycles the function pages.'),
    ),
    startStop: key(
      text('Start/Stopp', 'Start/Stop'),
      text('Startet oder stoppt den Aufwärts-Timer.', 'Starts or stops the count-up timer.'),
    ),
  },
  initial,
  step(state: Gtx327State, { controls, powered, inputs, dtMs }): Gtx327State {
    const held = Object.fromEntries(KEYS.map((id) => [id, String(controls[id])])) as Record<
      Key,
      string
    >;
    if (!powered) {
      return {
        ...state,
        altitude: null,
        reporting: false,
        ident: false,
        identRemainingMs: 0,
        entry: '',
        timerRunning: false,
        held,
      };
    }

    const mode = isMode(controls.mode) ? controls.mode : state.mode;
    if (mode === 'off') {
      return {
        ...state,
        mode,
        entry: '',
        altitude: null,
        reporting: false,
        ident: false,
        identRemainingMs: 0,
        timerMs: 0,
        timerRunning: false,
        held,
      };
    }
    const live = mode !== 'tst';
    const replying = mode === 'on' || mode === 'alt';
    const tapped = (id: Key): boolean => held[id] === 'pressed' && state.held[id] !== 'pressed';

    let { squawk, entry, page, timerMs, timerRunning } = state;
    let identRemainingMs = replying ? Math.max(0, state.identRemainingMs - dtMs) : 0;
    if (!live) entry = '';
    if (timerRunning) timerMs += dtMs;

    if (live) {
      for (const id of DIGIT_KEYS) {
        if (!tapped(id)) continue;
        entry += id.slice(-1);
        if (entry.length === CODE_LENGTH) [squawk, entry] = [entry, ''];
      }
      if (tapped('vfr')) [squawk, entry] = [VFR_CODE, ''];
      if (tapped('crsr')) entry = '';
      if (tapped('ident') && replying) identRemainingMs = IDENT_DURATION_MS;
    }
    if (tapped('func')) page = page === 'altitude' ? 'countUp' : 'altitude';
    if (page === 'countUp' && tapped('startStop')) timerRunning = !timerRunning;
    if (tapped('clr')) {
      if (entry !== '') entry = entry.slice(0, -1);
      else if (page === 'countUp' && !timerRunning) timerMs = 0;
    }

    const reading = inputs[PRESSURE_ALTITUDE_INPUT];
    const altitude =
      live && typeof reading === 'number' && Number.isFinite(reading) ? reading : null;

    return {
      mode,
      squawk,
      entry,
      altitude,
      reporting: mode === 'alt' && altitude !== null,
      ident: identRemainingMs > 0,
      identRemainingMs,
      page,
      timerMs,
      timerRunning,
      held,
    };
  },
});

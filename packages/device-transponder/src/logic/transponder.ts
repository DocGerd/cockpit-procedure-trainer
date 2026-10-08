import { defineDevice } from '@cpt/core';
import type { Text } from '@cpt/core';

export const MODES = ['off', 'stby', 'on', 'alt'] as const;
export type TransponderMode = (typeof MODES)[number];

export const IDENT_DURATION_MS = 18_000;
export const PRESSURE_ALTITUDE_INPUT = 'pressureAltitude';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7'] as const;
const CODE_CONTROLS = ['code1', 'code2', 'code3', 'code4'] as const;

export type TransponderState = {
  readonly mode: TransponderMode;
  readonly squawk: string;
  readonly altitude: number | null;
  readonly ident: boolean;
  readonly identRemainingMs: number;
  readonly held: { readonly ident: string };
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

// The display prints the code's digits; no key prints one.
const digitLegends = Object.fromEntries(DIGITS.map((digit) => [digit, digit]));

const isMode = (value: unknown): value is TransponderMode => MODES.some((mode) => mode === value);

const isDigit = (value: unknown): value is string => DIGITS.some((digit) => digit === value);

const digit = <const First extends (typeof DIGITS)[number]>(index: number, first: First) =>
  ({
    kind: 'rotary',
    positions: DIGITS,
    initial: first,
    legends: digitLegends,
    name: text(`Squawk-Ziffer ${index}`, `Squawk digit ${index}`),
    description: text(
      `Stellt die Ziffer ${index} des Transpondercodes ein.`,
      `Sets digit ${index} of the transponder code.`,
    ),
  }) as const;

const initial: TransponderState = {
  mode: 'off',
  squawk: '7000',
  altitude: null,
  ident: false,
  identRemainingMs: 0,
  held: { ident: 'released' },
};

export const transponderDevice = defineDevice({
  id: 'transponder',
  manual: text(
    'Generisches Gerät, kein Herstellerhandbuch',
    'Generic unit, no manufacturer manual',
  ),
  notModelled: [
    text('Abfragen und Antworten', 'Interrogation and replies'),
    text('ADS-B und Positionsmeldungen', 'ADS-B and position reports'),
    text(
      'Tastenverhalten für einen Standardcode über das Setzen des Codes hinaus',
      'Code-preset key behaviour beyond setting the code',
    ),
    text(
      'Ausgabe der Höhe in Schritten und Höhenkorrektur',
      'Altitude reporting increments and altitude correction',
    ),
    text('Selbsttest und Fehlermeldungen', 'Self test and fault messages'),
  ],
  controls: {
    mode: {
      kind: 'rotary',
      positions: MODES,
      initial: 'off',
      name: text('Betriebsart', 'Mode'),
      description: text(
        'Wählt AUS, Bereitschaft, EIN oder Höhe.',
        'Selects off, standby, on or altitude.',
      ),
    },
    code1: digit(1, '7'),
    code2: digit(2, '0'),
    code3: digit(3, '0'),
    code4: digit(4, '0'),
    ident: {
      kind: 'momentary',
      positions: ['released', 'pressed'],
      initial: 'released',
      legends: keyLegends,
      name: text('Ident', 'Ident'),
      description: text(
        'Löst die zeitlich begrenzte Identifizierung aus.',
        'Starts the timed identification.',
      ),
    },
  },
  initial,
  step(state: TransponderState, { controls, powered, inputs, dtMs }): TransponderState {
    const held = { ident: String(controls.ident) };
    if (!powered) {
      return { ...state, altitude: null, ident: false, identRemainingMs: 0, held };
    }

    const mode = isMode(controls.mode) ? controls.mode : state.mode;
    const squawk = CODE_CONTROLS.map((id, index) =>
      isDigit(controls[id]) ? controls[id] : (state.squawk[index] ?? '0'),
    ).join('');

    const replying = mode === 'on' || mode === 'alt';
    const pressed = held.ident === 'pressed' && state.held.ident !== 'pressed';
    const elapsed = Math.max(0, state.identRemainingMs - dtMs);
    const identRemainingMs = replying ? (pressed ? IDENT_DURATION_MS : elapsed) : 0;

    const reading = inputs[PRESSURE_ALTITUDE_INPUT];
    const altitude =
      mode === 'alt' && typeof reading === 'number' && Number.isFinite(reading) ? reading : null;

    return { mode, squawk, altitude, ident: identRemainingMs > 0, identRemainingMs, held };
  },
});

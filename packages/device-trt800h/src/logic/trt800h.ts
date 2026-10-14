import { defineDevice } from '@cpt/core';
import type { Text } from '@cpt/core';

export const MODES = ['stby', 'acs', 'as'] as const;
export type Trt800hMode = (typeof MODES)[number];

export const POWER_OFF_HOLD_MS = 3000;
export const VFR_STORE_HOLD_MS = 3000;
export const IDENT_MS = 18_000;
export const STORED_SHOW_MS = 1500;
export const PRESSURE_ALTITUDE_INPUT = 'pressureAltitude';
export const MIN_ALTITUDE_FT = -1000;
export const MAX_ALTITUDE_FT = 35_000;

const FT_PER_LEVEL = 100;
const CODE_LENGTH = 4;
const MAX_DIGIT = 7;
const FACTORY_VFR_CODE = '7000';
const PLACEHOLDER_CODE = '2000';

const KEYS = ['power', 'vfr', 'ident', 'mode', 'swap', 'cursor'] as const;
type Key = (typeof KEYS)[number];
type ControlId = Key | 'knob';

const HOLD_KEYS = ['power', 'vfr'] as const;
type HoldKey = (typeof HOLD_KEYS)[number];

export type Trt800hState = {
  readonly on: boolean;
  readonly mode: Trt800hMode;
  readonly squawk: string;
  readonly standby: string;
  readonly vfrCode: string;
  readonly vfrShown: boolean;
  readonly storedMs: number;
  readonly cursor: number | null;
  readonly identMs: number;
  readonly flightLevel: number | null;
  readonly reporting: boolean;
  readonly held: Readonly<Record<ControlId, string>>;
  /** Time a hold key has been down; null once its hold has acted, until the key is released. */
  readonly heldMs: Readonly<Record<HoldKey, number | null>>;
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

// The knob prints no word for its rest or turn, so cues name each in words.
const knobLegends = {
  rest: { state: text('losgelassen', 'released'), restore: text('Wieder loslassen', 'Release it') },
  down: {
    state: text('abwärts gedreht', 'turned down'),
    restore: text('Wieder abwärts drehen', 'Turn it down again'),
  },
  up: {
    state: text('aufwärts gedreht', 'turned up'),
    restore: text('Wieder aufwärts drehen', 'Turn it up again'),
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

const resting = (): Record<ControlId, string> => ({
  power: 'released',
  vfr: 'released',
  ident: 'released',
  mode: 'released',
  swap: 'released',
  cursor: 'released',
  knob: 'rest',
});

const idle = { power: 0, vfr: 0 } as const;

const initial: Trt800hState = {
  on: false,
  mode: 'stby',
  squawk: PLACEHOLDER_CODE,
  standby: PLACEHOLDER_CODE,
  vfrCode: FACTORY_VFR_CODE,
  vfrShown: false,
  storedMs: 0,
  cursor: null,
  identMs: 0,
  flightLevel: null,
  reporting: false,
  held: resting(),
  heldMs: idle,
};

const switchedOff = (state: Trt800hState): Trt800hState => ({
  ...state,
  on: false,
  mode: 'stby',
  vfrShown: false,
  storedMs: 0,
  cursor: null,
  identMs: 0,
  flightLevel: null,
  reporting: false,
});

function flightLevel(altitude: unknown): number | null {
  if (typeof altitude !== 'number' || !Number.isFinite(altitude)) return null;
  if (altitude < MIN_ALTITUDE_FT || altitude > MAX_ALTITUDE_FT) return null;
  return Math.floor(altitude / FT_PER_LEVEL);
}

function turnDigit(code: string, place: number, direction: number): string {
  const digit = Number(code[place]);
  const next = (digit + direction + MAX_DIGIT + 1) % (MAX_DIGIT + 1);
  return code.slice(0, place) + String(next) + code.slice(place + 1);
}

export const trt800hDevice = defineDevice({
  id: 'trt800h',
  manual: text(
    'funkwerk TRT800H-OLED, Bedienungsanleitung Revision 3.00, wie in docs/aircraft/ctsl-intake.md §3.8.2 zusammengefasst',
    'funkwerk TRT800H-OLED, operation manual revision 3.00, as summarised in docs/aircraft/ctsl-intake.md §3.8.2',
  ),
  notModelled: [
    text(
      'Abfragen, Antworten, Antwort- und Sperranzeige, Squitter und ADS-B',
      'Interrogations, replies, the reply and lock-out indicators, squitter and ADS-B',
    ),
    text(
      'Flight-ID-Anzeige und -Eingabe, Einstellseiten und Höhenkorrektur (ID in Standby gehalten)',
      'Flight ID display and entry, setup pages and altitude correction (ID held in standby)',
    ),
    text(
      'Betrieb ohne die Adresse der Halterung (Cradle OFF, AC-, A--) und die Liste beim Einschalten',
      "Operation without the cradle's address (Cradle OFF, AC-, A--) and the power-up record list",
    ),
    text('Helligkeit (DIM)', 'Brightness (DIM)'),
    text(
      'Fehlercodes, die Warnung bei niedriger Spannung (BAT) und der Testmodus',
      'Error codes, the low-voltage BAT warning and test mode',
    ),
    text('Zustand des Bodenschalters', 'The ground-switch state'),
    text('Startbildschirm', 'The start screen'),
    text('Fernbedienteil', 'The remote control head'),
  ],
  controls: {
    power: key(
      text('Ein/Aus', 'On/off'),
      text(
        'Ein Druck schaltet das Gerät in Standby ein; drei Sekunden gehalten schaltet es aus.',
        'A press switches the unit on in standby; held for three seconds it switches off.',
      ),
    ),
    vfr: key(
      text('VFR', 'VFR'),
      text(
        'Kurz: macht den VFR-Code aktiv. Lang gehalten: speichert den aktiven Code als VFR-Code.',
        'Short: makes the VFR code active. Held: stores the active code as the VFR code.',
      ),
    ),
    ident: key(
      text('Ident', 'Ident'),
      text(
        'Sendet in ACS und A-S die zeitlich begrenzte Identifizierung.',
        'Sends the timed identification in ACS and A-S.',
      ),
    ),
    mode: key(
      text('Betriebsart', 'Mode'),
      text('Schaltet reihum zwischen Standby, ACS und A-S.', 'Steps through standby, ACS and A-S.'),
    ),
    swap: key(
      text('Wechsel', 'Change'),
      text(
        'Tauscht aktiven und Bereitschaftscode oder setzt den Cursor eine Ziffer zurück.',
        'Exchanges the active and standby codes, or moves the cursor back one digit.',
      ),
    ),
    cursor: key(
      text('Cursor', 'Cursor'),
      text(
        'Setzt den Cursor auf eine Ziffer des Bereitschaftscodes und rückt ihn weiter.',
        'Puts the cursor on a digit of the standby code and moves it on.',
      ),
    ),
    knob: {
      kind: 'rotary',
      positions: ['rest', 'down', 'up'],
      initial: 'rest',
      springBack: { down: 'rest', up: 'rest' },
      legends: knobLegends,
      name: text('Drehknopf', 'Knob'),
      description: text(
        'Ändert die Ziffer unter dem Cursor von 0 bis 7.',
        'Changes the digit under the cursor from 0 to 7.',
      ),
    },
  },
  initial,
  step(state: Trt800hState, { controls, powered, inputs, dtMs }): Trt800hState {
    const held = Object.fromEntries(
      [...KEYS, 'knob'].map((id) => [id, String(controls[id])]),
    ) as Record<ControlId, string>;
    const down = (id: Key): boolean => held[id] === 'pressed';
    const pressedNow = (id: Key): boolean => down(id) && state.held[id] !== 'pressed';
    const releasedNow = (id: Key): boolean => !down(id) && state.held[id] === 'pressed';

    if (!powered) return { ...switchedOff(state), held, heldMs: idle };
    if (!state.on) {
      if (!pressedNow('power')) return { ...switchedOff(state), held, heldMs: idle };
      return {
        ...state,
        on: true,
        mode: 'stby',
        flightLevel: flightLevel(inputs[PRESSURE_ALTITUDE_INPUT]),
        held,
        heldMs: { power: null, vfr: 0 },
      };
    }

    const heldMs = { ...state.heldMs };
    for (const id of HOLD_KEYS) {
      if (!down(id)) heldMs[id] = 0;
      else if (pressedNow(id)) heldMs[id] = 0;
    }
    let { mode, squawk, standby, vfrCode, vfrShown, storedMs, cursor, identMs } = state;
    storedMs = Math.max(0, storedMs - dtMs);
    identMs = Math.max(0, identMs - dtMs);

    for (const id of HOLD_KEYS) {
      const elapsed = heldMs[id];
      if (down(id) && elapsed !== null) heldMs[id] = elapsed + dtMs;
    }
    if (heldMs.power !== null && heldMs.power >= POWER_OFF_HOLD_MS) {
      return { ...switchedOff(state), held, heldMs: { power: null, vfr: 0 } };
    }

    const showStandby = () => {
      vfrShown = false;
    };

    if (releasedNow('vfr') && state.heldMs.vfr !== null) {
      cursor = null;
      if (vfrShown) showStandby();
      else {
        if (squawk !== vfrCode) [squawk, standby] = [vfrCode, squawk];
        vfrShown = true;
      }
    }
    if (heldMs.vfr !== null && heldMs.vfr >= VFR_STORE_HOLD_MS) {
      vfrCode = squawk;
      vfrShown = true;
      storedMs = STORED_SHOW_MS;
      cursor = null;
      heldMs.vfr = null;
    }

    if (pressedNow('mode')) {
      mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length] ?? 'stby';
    }
    if (mode === 'stby') identMs = 0;
    else if (pressedNow('ident')) identMs = IDENT_MS;

    if (pressedNow('cursor')) {
      showStandby();
      cursor = cursor === null ? 0 : cursor + 1 < CODE_LENGTH ? cursor + 1 : null;
    }
    if (pressedNow('swap')) {
      if (cursor !== null) cursor = cursor === 0 ? null : cursor - 1;
      else if (vfrShown) showStandby();
      else [squawk, standby] = [standby, squawk];
    }
    if (held.knob !== 'rest' && state.held.knob !== held.knob) {
      if (cursor !== null) standby = turnDigit(standby, cursor, held.knob === 'up' ? 1 : -1);
      else if (vfrShown) showStandby();
    }

    const level = flightLevel(inputs[PRESSURE_ALTITUDE_INPUT]);
    return {
      on: true,
      mode,
      squawk,
      standby,
      vfrCode,
      vfrShown,
      storedMs,
      cursor,
      identMs,
      flightLevel: level,
      reporting: mode === 'acs' && level !== null,
      held,
      heldMs,
    };
  },
});

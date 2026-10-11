import { defineDevice } from '@cpt/core';
import type { Text } from '@cpt/core';

export const POWER_OFF_HOLD_MS = 3000;
export const MEM_SAVE_HOLD_MS = 1500;
/** SET held this long opens the setup menu, which is not modelled. */
export const SETUP_MENU_HOLD_MS = 5000;
export const MENU_TIMEOUT_MS = 10_000;
export const MEMORY_SLOTS = 20;
export const RECENT_LIMIT = 10;

/** The last two digits of the 16 channel names in a 100 kHz block at 8.33 kHz spacing. */
export const CHANNEL_NAMES = [
  0, 5, 10, 15, 25, 30, 35, 40, 50, 55, 60, 65, 75, 80, 85, 90,
] as const;

const KHZ_PER_MHZ = 1000;
const KHZ_PER_BLOCK = 100;
const MIN_MHZ = 118;
const MAX_MHZ = 136;
const MAX_TENTHS = 9;
const INITIAL_ACTIVE_KHZ = 118_000;
const INITIAL_STANDBY_KHZ = 119_000;

/** Marks a press that must not act: it began while the unit was off or switched it on. */
const IGNORED = -1;

export const KEY_IDS = ['power', 'set', 'mem', 'dw', 'swap', 'cursor'] as const;
export const KNOB_IDS = ['volSel', 'freq'] as const;
const CONTROL_IDS = [...KEY_IDS, ...KNOB_IDS] as const;
type ControlId = (typeof CONTROL_IDS)[number];
const HOLD_KEYS = ['power', 'set', 'mem'] as const;
type HoldKey = (typeof HOLD_KEYS)[number];

export const CURSORS = ['mhz', 'tenths', 'channel'] as const;
export type Atr833Cursor = (typeof CURSORS)[number];

export const ITEMS = ['vol', 'sql', 'vox', 'int', 'stl', 'str', 'ext', 'brt'] as const;
export type Atr833Item = (typeof ITEMS)[number];

const RANGES: Readonly<Record<Atr833Item, readonly [min: number, max: number]>> = {
  vol: [1, 20],
  sql: [0, 9],
  vox: [0, 9],
  int: [1, 20],
  stl: [1, 20],
  str: [1, 20],
  ext: [0, 20],
  brt: [0, 9],
};

export type Atr833Settings = Readonly<Record<Atr833Item, number>>;

export type Atr833List = {
  readonly kind: 'mem' | 'lst' | 'save';
  readonly index: number;
} | null;

export type Atr833State = {
  readonly on: boolean;
  readonly powered: boolean;
  readonly active: number;
  readonly standby: number;
  readonly cursor: Atr833Cursor;
  readonly dualWatch: boolean;
  readonly item: Atr833Item;
  readonly settings: Atr833Settings;
  readonly list: Atr833List;
  readonly memory: readonly (number | null)[];
  readonly recent: readonly number[];
  readonly saved: boolean;
  readonly idleMs: number;
  readonly held: Readonly<Record<ControlId, string>>;
  readonly heldMs: Readonly<Record<HoldKey, number>>;
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

// The unit prints no word for a knob's rest or turn, so cues name each in words.
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

const knob = (name: Text, description: Text) =>
  ({
    kind: 'rotary',
    positions: ['rest', 'down', 'up'],
    initial: 'rest',
    springBack: { down: 'rest', up: 'rest' },
    legends: knobLegends,
    name,
    description,
  }) as const;

export const formatFrequency = (khz: number): string => (khz / KHZ_PER_MHZ).toFixed(3);

const wrap = (value: number, min: number, max: number): number =>
  value > max ? min : value < min ? max : value;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const channelIndex = (lastTwoDigits: number): number =>
  Math.max(0, CHANNEL_NAMES.filter((name) => name <= lastTwoDigits).length - 1);

/** Steps the underlined field of a frequency; each field wraps without carrying into its neighbour. */
function stepFrequency(khz: number, cursor: Atr833Cursor, direction: number): number {
  const mhz = Math.floor(khz / KHZ_PER_MHZ);
  const tenths = Math.floor((khz % KHZ_PER_MHZ) / KHZ_PER_BLOCK);
  const channel = channelIndex(khz % KHZ_PER_BLOCK);
  const next = {
    mhz: wrap(mhz + (cursor === 'mhz' ? direction : 0), MIN_MHZ, MAX_MHZ),
    tenths: wrap(tenths + (cursor === 'tenths' ? direction : 0), 0, MAX_TENTHS),
    channel: wrap(channel + (cursor === 'channel' ? direction : 0), 0, CHANNEL_NAMES.length - 1),
  };
  return next.mhz * KHZ_PER_MHZ + next.tenths * KHZ_PER_BLOCK + (CHANNEL_NAMES[next.channel] ?? 0);
}

const listLength = (state: Atr833State, kind: 'mem' | 'lst' | 'save'): number =>
  kind === 'lst' ? Math.max(1, state.recent.length) : MEMORY_SLOTS;

export function listEntry(state: Atr833State): number | null {
  const list = state.list;
  if (list === null || list.kind === 'save') return null;
  return (list.kind === 'mem' ? state.memory[list.index] : state.recent[list.index]) ?? null;
}

const pad = (value: number): string => String(value).padStart(2, '0');

export function lineThree(state: Atr833State): string {
  const { list } = state;
  if (list?.kind === 'save') return `MEM SAVE ${pad(list.index + 1)}`;
  if (list !== null) return `${list.kind.toUpperCase()} ${pad(list.index + 1)}`;
  const value = state.settings[state.item];
  const shown = state.item === 'ext' && value === 0 ? 'off' : String(value);
  return `${state.item.toUpperCase()} ${shown}`;
}

export function listPreview(state: Atr833State): string | null {
  if (state.list === null || state.list.kind === 'save') return null;
  const entry = listEntry(state);
  return entry === null ? '---' : formatFrequency(entry);
}

export function frequencyParts(khz: number): Record<Atr833Cursor, string> {
  const [whole = '', fraction = ''] = formatFrequency(khz).split('.');
  return { mhz: whole, tenths: fraction.slice(0, 1), channel: fraction.slice(1) };
}

const initial: Atr833State = {
  on: false,
  powered: false,
  active: INITIAL_ACTIVE_KHZ,
  standby: INITIAL_STANDBY_KHZ,
  cursor: 'mhz',
  dualWatch: false,
  item: 'vol',
  settings: { vol: 10, sql: 5, vox: 5, int: 10, stl: 10, str: 10, ext: 0, brt: 9 },
  list: null,
  memory: Array.from({ length: MEMORY_SLOTS }, () => null),
  recent: [],
  saved: false,
  idleMs: 0,
  held: Object.fromEntries(
    CONTROL_IDS.map((id) => [id, id === 'volSel' || id === 'freq' ? 'rest' : 'released']),
  ) as Record<ControlId, string>,
  heldMs: { power: 0, set: 0, mem: 0 },
};

const transients = { dualWatch: false, item: 'vol', list: null, saved: false, idleMs: 0 } as const;

const engaged = (position: string): boolean => position !== 'released' && position !== 'rest';
const direction = (position: string): number => (position === 'up' ? 1 : -1);

/** How long each hold key has been down; a press that must not act is marked IGNORED until it ends. */
function heldTimes(
  state: Atr833State,
  held: Record<ControlId, string>,
  on: boolean,
  dtMs: number,
): Record<HoldKey, number> {
  const next = { power: 0, set: 0, mem: 0 };
  for (const id of HOLD_KEYS) {
    if (held[id] !== 'pressed') continue;
    const before = state.held[id] === 'pressed' ? state.heldMs[id] : on ? 0 : IGNORED;
    next[id] = before === IGNORED ? IGNORED : before + dtMs;
  }
  return next;
}

const crossed = (before: number, after: number, threshold: number): boolean =>
  before >= 0 && before < threshold && after >= threshold;

const becomeActive = (state: Atr833State, active: number, standby: number): Atr833State => ({
  ...state,
  active,
  standby,
  dualWatch: false,
  saved: false,
  recent: [active, ...state.recent.filter((khz) => khz !== active)].slice(0, RECENT_LIMIT),
});

const changeStandby = (state: Atr833State, standby: number): Atr833State => ({
  ...state,
  standby,
  dualWatch: false,
  saved: false,
});

function pressSet(state: Atr833State): Atr833State {
  const { list } = state;
  if (list?.kind === 'save') return state;
  if (list !== null) {
    const entry = listEntry(state);
    return entry === null ? state : { ...changeStandby(state, entry), list: null };
  }
  const next = ITEMS[(ITEMS.indexOf(state.item) + 1) % ITEMS.length] ?? 'vol';
  return { ...state, item: next };
}

function releaseMem(state: Atr833State): Atr833State {
  const { list } = state;
  if (list === null) return { ...state, list: { kind: 'mem', index: 0 } };
  if (list.kind === 'mem') return { ...state, list: { kind: 'lst', index: 0 } };
  if (list.kind === 'lst') return { ...state, list: null };
  const memory = state.memory.map((slot, index) => (index === list.index ? state.standby : slot));
  return { ...state, memory, list: null, saved: true };
}

function pressDualWatch(state: Atr833State): Atr833State {
  if (state.list !== null || state.item !== 'vol') return { ...state, list: null, item: 'vol' };
  return { ...state, dualWatch: !state.dualWatch && state.settings.sql >= 1 };
}

function pressSwap(state: Atr833State): Atr833State {
  const { list } = state;
  if (list?.kind === 'save') return state;
  if (list !== null) {
    const entry = listEntry(state);
    return entry === null ? state : { ...becomeActive(state, entry, state.standby), list: null };
  }
  return becomeActive(state, state.standby, state.active);
}

function turnVolSel(state: Atr833State, step: number): Atr833State {
  const { list } = state;
  if (list !== null) {
    const length = listLength(state, list.kind);
    return { ...state, list: { ...list, index: (list.index + step + length) % length } };
  }
  const [min, max] = RANGES[state.item];
  const settings = {
    ...state.settings,
    [state.item]: clamp(state.settings[state.item] + step, min, max),
  };
  return { ...state, settings };
}

const nextCursor = (cursor: Atr833Cursor): Atr833Cursor =>
  CURSORS[(CURSORS.indexOf(cursor) + 1) % CURSORS.length] ?? 'mhz';

function switchedOff(state: Atr833State): Atr833State {
  return { ...state, on: false, ...transients };
}

export const atr833Device = defineDevice({
  id: 'atr833',
  manual: text(
    'funkwerk ATR833-OLED, Bedienung nach dem Handbuch ATR833-II (Dokument 01.143.010.71e, Revision 1.06), nur Bedienelemente der Frontplatte von D-MPGO; Abschnitt 3.8.1 der Aufnahme',
    'funkwerk ATR833-OLED, operation from the ATR833-II manual (document 01.143.010.71e, revision 1.06), limited to the controls on D-MPGO’s face; intake section 3.8.1',
  ),
  notModelled: [
    text(
      'Empfang, Senden und Audio (RX, TX, Te und die Sendezeitbegrenzung; Lautstärken sind nur Zahlen)',
      'Reception, transmission and audio (RX, TX, Te and the stuck-microphone time-out; volumes are numbers only)',
    ),
    text('Wiedergabe des letzten Anrufs (REPLAY)', 'REPLAY of the last call'),
    text(
      'Das Einstellmenü (SET lang gedrückt): Kanalraster (fest 8,33 kHz), Display-Dimmung, Absenkung der Lautstärke bei Doppelhören, PTT-Wahl, Mikrofon-, Kopfhörer- und externe Audio-Einstellungen, AUTO ON (fest ein), Versionen',
      'The setup menu (SET held 5 s): spacing (fixed 8.33 kHz), display dimming, dual-watch volume reduction, PTT selection, microphone, headset and external-audio settings, AUTO ON (fixed on), versions',
    ),
    text('Speichernamen und Löschen eines Speichers', 'Memory names and clearing a slot'),
    text('Die Unterspannungswarnung BAT', 'The low-voltage BAT warning'),
    text('Der Startbildschirm', 'The start screen'),
    text('Das Zurücksetzen auf Werkseinstellungen', 'Factory reset'),
    text(
      'Externe Tauschtaste, Bordsprechanlagenschalter, Fernbedienung und PC-Frequenzprogramm',
      'The external swap button, intercom switch, remote control and PC frequency tool',
    ),
  ],
  controls: {
    power: key(
      text('Ein/Aus', 'On/off'),
      text(
        'Ein: eine Berührung schaltet das Gerät ein. Aus: lange gedrückt halten.',
        'On: any press switches the unit on. Off: hold it down.',
      ),
    ),
    set: key(
      text('Einstellung', 'Set'),
      text(
        'Schaltet die dritte Zeile durch ihre Einträge; in einer Liste: Eintrag in die Bereitschaftsfrequenz.',
        'Steps the third line through its items; in a list, loads the entry into the standby frequency.',
      ),
    ),
    mem: key(
      text('Speicher', 'Memory'),
      text(
        'Öffnet die Speicherliste, dann die Liste der zuletzt aktiven Frequenzen; lange gedrückt: Speichern.',
        'Opens the memory list, then the list of the last active frequencies; held: save mode.',
      ),
    ),
    dw: key(
      text('Doppelhören', 'Dual watch'),
      text(
        'Schaltet das Doppelhören um; in einem Menü oder einer Liste: zurück zur Standardanzeige.',
        'Toggles dual watch; in a menu or list, back to the standard display.',
      ),
    ),
    swap: key(
      text('Tausch', 'Swap'),
      text(
        'Tauscht aktive und Bereitschaftsfrequenz; in einer Liste: Eintrag in die aktive Frequenz.',
        'Exchanges the active and standby frequencies; in a list, loads the entry into the active frequency.',
      ),
    ),
    cursor: key(
      text('Cursor', 'Cursor'),
      text(
        'Setzt den Unterstrich auf das nächste Feld der Bereitschaftsfrequenz.',
        'Moves the underline to the next field of the standby frequency.',
      ),
    ),
    volSel: knob(
      text('Lautstärke/Auswahl', 'Volume/select'),
      text(
        'Ändert den Wert der dritten Zeile, den Listeneintrag oder den Speicherplatz.',
        'Changes the value on line 3, the list entry or the save slot.',
      ),
    ),
    freq: knob(
      text('Frequenz', 'Frequency'),
      text(
        'Ändert das unterstrichene Feld der Bereitschaftsfrequenz.',
        'Changes the underlined field of the standby frequency.',
      ),
    ),
  },
  initial,
  step(state: Atr833State, { controls, powered, dtMs }): Atr833State {
    const held = Object.fromEntries(CONTROL_IDS.map((id) => [id, String(controls[id])])) as Record<
      ControlId,
      string
    >;

    if (!powered) {
      const heldMs = { power: 0, set: 0, mem: 0 };
      for (const id of HOLD_KEYS) if (held[id] === 'pressed') heldMs[id] = IGNORED;
      return { ...switchedOff({ ...state, powered: false }), held, heldMs };
    }

    const engagedNow = (id: ControlId): boolean => engaged(held[id]) && held[id] !== state.held[id];
    const heldMs = heldTimes(state, held, state.on, dtMs);
    let next: Atr833State = { ...state, powered: true, held, heldMs };
    if (!state.powered) next = { ...next, on: true, cursor: 'mhz' };
    else if (!state.on && engagedNow('power')) next = { ...next, on: true, cursor: 'mhz' };
    if (!next.on) return { ...next, ...transients };

    const released = (id: HoldKey): boolean =>
      state.held[id] === 'pressed' && held[id] === 'released' && state.heldMs[id] >= 0;
    const touched = CONTROL_IDS.some((id) => held[id] !== state.held[id]);

    if (crossed(state.heldMs.power, heldMs.power, POWER_OFF_HOLD_MS)) {
      return switchedOff(next);
    }
    if (crossed(state.heldMs.mem, heldMs.mem, MEM_SAVE_HOLD_MS) && next.list?.kind !== 'save') {
      next = { ...next, list: { kind: 'save', index: 0 } };
    }
    if (released('set') && state.heldMs.set < SETUP_MENU_HOLD_MS) next = pressSet(next);
    if (released('mem') && state.heldMs.mem < MEM_SAVE_HOLD_MS) next = releaseMem(next);
    if (engagedNow('dw')) next = pressDualWatch(next);
    if (engagedNow('swap')) next = pressSwap(next);
    if (engagedNow('cursor')) next = { ...next, cursor: nextCursor(next.cursor) };
    if (engagedNow('volSel')) next = turnVolSel(next, direction(held.volSel));
    if (engagedNow('freq')) {
      next = changeStandby(next, stepFrequency(next.standby, next.cursor, direction(held.freq)));
    }

    const menuOpen = next.list !== null || next.item !== 'vol';
    const idleMs = touched || !menuOpen ? 0 : next.idleMs + dtMs;
    if (menuOpen && idleMs >= MENU_TIMEOUT_MS)
      return { ...next, list: null, item: 'vol', idleMs: 0 };
    return { ...next, idleMs };
  },
});

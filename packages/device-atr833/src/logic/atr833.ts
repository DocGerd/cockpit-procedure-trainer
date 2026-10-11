import { defineDevice } from '@cpt/core';
import type { Text } from '@cpt/core';

export const POWER_OFF_HOLD_MS = 2000;
/** A SET hold this long returns line 3 to VOL; a MEM hold this long in the memory list stores. */
export const LONG_PRESS_MS = 1500;
export const MENU_TIMEOUT_MS = 12_000;
export const MEMORY_SLOTS = 100;
export const RECENT_LIMIT = 10;
export const DUAL_WATCH_MIN_SQL = 2;

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

/** Marks a press that must not act: it began while the unit was off, switched it on or already acted. */
const IGNORED = -1;

export const KEY_IDS = ['power', 'set', 'mem', 'dw', 'swap', 'cursor'] as const;
export const KNOB_IDS = ['volSel', 'freq'] as const;
const CONTROL_IDS = [...KEY_IDS, ...KNOB_IDS] as const;
type ControlId = (typeof CONTROL_IDS)[number];
const HOLD_KEYS = ['power', 'set', 'mem'] as const;
type HoldKey = (typeof HOLD_KEYS)[number];

export const CURSORS = ['mhz', 'tenths', 'channel'] as const;
export type Atr833Cursor = (typeof CURSORS)[number];

export const ITEMS = ['vol', 'sql', 'dim', 'vox', 'dwm', 'int', 'ext'] as const;
export type Atr833Item = (typeof ITEMS)[number];

const RANGES: Readonly<Record<Atr833Item, readonly [min: number, max: number]>> = {
  vol: [1, 16],
  sql: [1, 10],
  dim: [1, 10],
  vox: [1, 10],
  dwm: [-8, 0],
  int: [1, 10],
  ext: [0, 10],
};

export type Atr833Settings = Readonly<Record<Atr833Item, number>>;

type ListKind = 'mem' | 'lst';
type OpenList = { readonly kind: ListKind; readonly index: number };
export type Atr833List = OpenList | null;

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
  /** `LST 00`: the last standby frequency the memory list set. */
  readonly lastFromMemory: number | null;
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

// LST 00 comes before the ten last-used frequencies.
const listLength = (state: Atr833State, kind: ListKind): number =>
  kind === 'lst' ? 1 + state.recent.length : MEMORY_SLOTS;

const entryOf = (state: Atr833State, { kind, index }: OpenList): number | null =>
  (kind === 'mem'
    ? state.memory[index]
    : index === 0
      ? state.lastFromMemory
      : state.recent[index - 1]) ?? null;

export const listEntry = (state: Atr833State): number | null =>
  state.list === null ? null : entryOf(state, state.list);

const pad = (value: number): string => String(value).padStart(2, '0');
const formatValue = (value: number): string => (value < 0 ? `-${-value}` : pad(value));

export function lineThree(state: Atr833State): string {
  const { list } = state;
  if (list !== null) return `${list.kind.toUpperCase()} ${pad(list.index)}`;
  return `${state.item.toUpperCase()} ${formatValue(state.settings[state.item])}`;
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
  settings: { vol: 10, sql: 5, dim: 10, vox: 5, dwm: 0, int: 5, ext: 0 },
  list: null,
  memory: Array.from({ length: MEMORY_SLOTS }, () => null),
  recent: [],
  lastFromMemory: null,
  idleMs: 0,
  held: Object.fromEntries(
    CONTROL_IDS.map((id) => [id, id === 'volSel' || id === 'freq' ? 'rest' : 'released']),
  ) as Record<ControlId, string>,
  heldMs: { power: 0, set: 0, mem: 0 },
};

const transients = { dualWatch: false, item: 'vol', list: null, idleMs: 0 } as const;

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
  recent: [active, ...state.recent.filter((khz) => khz !== active)].slice(0, RECENT_LIMIT),
});

const changeStandby = (state: Atr833State, standby: number): Atr833State =>
  standby === state.standby ? state : { ...state, standby, dualWatch: false };

/** Shows a list entry; the entry replaces the standby frequency at once. */
function select(state: Atr833State, list: OpenList): Atr833State {
  const entry = entryOf(state, list);
  const next = { ...state, list };
  if (entry === null) return next;
  const lastFromMemory = list.kind === 'mem' ? entry : state.lastFromMemory;
  return { ...changeStandby(next, entry), lastFromMemory };
}

const closeList = (state: Atr833State): Atr833State => ({ ...state, list: null });

function pressSet(state: Atr833State): Atr833State {
  if (state.list !== null) return closeList(state);
  const next = ITEMS[(ITEMS.indexOf(state.item) + 1) % ITEMS.length] ?? 'vol';
  return { ...state, item: next };
}

function releaseMem(state: Atr833State): Atr833State {
  const { list } = state;
  if (list === null) return select(state, { kind: 'mem', index: 0 });
  if (list.kind === 'mem') return select(state, { kind: 'lst', index: 0 });
  return closeList(state);
}

function storeActive(state: Atr833State, { index }: OpenList): Atr833State {
  const memory = state.memory.map((slot, slotIndex) => (slotIndex === index ? state.active : slot));
  return { ...changeStandby({ ...state, memory }, state.active), lastFromMemory: state.active };
}

function pressDualWatch(state: Atr833State): Atr833State {
  if (state.list !== null) return closeList(state);
  return { ...state, dualWatch: !state.dualWatch && state.settings.sql >= DUAL_WATCH_MIN_SQL };
}

const pressSwap = (state: Atr833State): Atr833State =>
  closeList(becomeActive(state, state.standby, state.active));

const nextCursor = (cursor: Atr833Cursor): Atr833Cursor =>
  CURSORS[(CURSORS.indexOf(cursor) + 1) % CURSORS.length] ?? 'mhz';

const pressCursor = (state: Atr833State): Atr833State =>
  state.list !== null ? closeList(state) : { ...state, cursor: nextCursor(state.cursor) };

function turnVolSel(state: Atr833State, step: number): Atr833State {
  const { list } = state;
  if (list !== null) {
    const length = listLength(state, list.kind);
    return select(state, { ...list, index: (list.index + step + length) % length });
  }
  const [min, max] = RANGES[state.item];
  const settings = {
    ...state.settings,
    [state.item]: clamp(state.settings[state.item] + step, min, max),
  };
  return { ...state, settings };
}

function switchedOff(state: Atr833State): Atr833State {
  return { ...state, on: false, ...transients };
}

export const atr833Device = defineDevice({
  id: 'atr833',
  manual: text(
    'funkwerk ATR833-OLED, Bedienung nach dem Handbuch ATR833A-OLED (Dokument 01.1411.010.71e, Revision 3.00, bei ManualsLib), nur Bedienelemente der Frontplatte von D-MPGO; Abschnitt 3.8.1 der Aufnahme',
    'funkwerk ATR833-OLED, operation from the ATR833A-OLED manual (document 01.1411.010.71e, revision 3.00, hosted by ManualsLib), limited to the controls on D-MPGO’s face; intake section 3.8.1',
  ),
  notModelled: [
    text(
      'Empfang, Senden und Audio (RX, TX, Te und die Sendeabschaltung nach zwei Minuten; Lautstärken, DIM und DWM sind nur Zahlen)',
      'Reception, transmission and audio (RX, TX, Te and the two-minute transmit cut-off; volumes, DIM and DWM are numbers only)',
    ),
    text(
      'Das Konfigurationsmenü (SET 5 s gedrückt): Kanalraster (fest 8,33 kHz), automatische Display-Abdunklung, PTT-Wahl, Vorrang des externen Audioeingangs, Mikrofonempfindlichkeiten, Testmodus',
      'The configuration menu (SET held 5 s): spacing (fixed 8.33 kHz), automatic display darkening, PTT selection, external-audio priority, microphone sensitivities, test mode',
    ),
    text('Speichernamen', 'Memory names'),
    text('Die Unterspannungswarnung BAT', 'The low-voltage BAT warning'),
    text(
      'Der Startbildschirm mit Typ und Softwareversion',
      'The start screen with type and software version',
    ),
    text('Das Zurücksetzen auf Werkseinstellungen', 'Master reset'),
    text(
      'Externer Bordsprechanlagenschalter, Fernbedienung und PC-Frequenzprogramm',
      'The external intercom switch, remote control and PC frequency tool',
    ),
  ],
  controls: {
    power: key(
      text('Ein/Aus', 'On/off'),
      text(
        'Ein: eine Berührung schaltet das Gerät ein. Aus: etwa 2 s gedrückt halten.',
        'On: any press switches the unit on. Off: hold it down for about 2 s.',
      ),
    ),
    set: key(
      text('Einstellung', 'Set'),
      text(
        'Schaltet die dritte Zeile durch ihre Einträge; lange gedrückt: zurück zu VOL; in einer Liste: Liste verlassen.',
        'Steps the third line through its items; held, back to VOL; in a list, leaves the list.',
      ),
    ),
    mem: key(
      text('Speicher', 'Memory'),
      text(
        'Öffnet die Speicherliste, dann die Liste der zuletzt aktiven Frequenzen; in der Speicherliste lange gedrückt: aktive Frequenz speichern.',
        'Opens the memory list, then the list of the last active frequencies; held in the memory list, stores the active frequency.',
      ),
    ),
    dw: key(
      text('Doppelhören', 'Dual watch'),
      text(
        'Schaltet das Doppelhören um; in einer Liste: Liste verlassen.',
        'Toggles dual watch; in a list, leaves the list.',
      ),
    ),
    swap: key(
      text('Tausch', 'Swap'),
      text(
        'Tauscht aktive und Bereitschaftsfrequenz; in einer Liste verlässt es die Liste dabei.',
        'Exchanges the active and standby frequencies; in a list, also leaves the list.',
      ),
    ),
    cursor: key(
      text('Cursor', 'Cursor'),
      text(
        'Setzt den Unterstrich auf das nächste Feld der Bereitschaftsfrequenz; in einer Liste: Liste verlassen.',
        'Moves the underline to the next field of the standby frequency; in a list, leaves the list.',
      ),
    ),
    volSel: knob(
      text('Lautstärke/Auswahl', 'Volume/select'),
      text(
        'Ändert den Wert der dritten Zeile; in einer Liste: wählt den Eintrag, der sofort Bereitschaftsfrequenz wird.',
        'Changes the value on line 3; in a list, picks the entry, which at once becomes the standby frequency.',
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
    if (!state.on && engagedNow('power')) next = { ...next, on: true, cursor: 'mhz' };
    if (!next.on) return { ...next, ...transients };

    const released = (id: HoldKey): boolean =>
      state.held[id] === 'pressed' && held[id] === 'released' && state.heldMs[id] >= 0;
    const consume = (id: HoldKey): Atr833State['heldMs'] => ({ ...next.heldMs, [id]: IGNORED });
    const touched = CONTROL_IDS.some((id) => held[id] !== state.held[id]);

    if (crossed(state.heldMs.power, heldMs.power, POWER_OFF_HOLD_MS)) {
      return switchedOff(next);
    }
    if (crossed(state.heldMs.set, heldMs.set, LONG_PRESS_MS)) {
      next = { ...closeList(next), item: 'vol', heldMs: consume('set') };
    }
    const memoryList = next.list?.kind === 'mem' ? next.list : null;
    if (memoryList !== null && crossed(state.heldMs.mem, heldMs.mem, LONG_PRESS_MS)) {
      next = { ...storeActive(next, memoryList), heldMs: consume('mem') };
    }
    if (released('set')) next = pressSet(next);
    if (released('mem')) next = releaseMem(next);
    if (engagedNow('dw')) next = pressDualWatch(next);
    if (engagedNow('swap')) next = pressSwap(next);
    if (engagedNow('cursor')) next = pressCursor(next);
    if (engagedNow('volSel')) next = turnVolSel(next, direction(held.volSel));
    if (engagedNow('freq')) {
      const tuned = stepFrequency(next.standby, next.cursor, direction(held.freq));
      next = changeStandby(closeList(next), tuned);
    }

    const menuOpen = next.list !== null || next.item !== 'vol';
    const idleMs = touched || !menuOpen ? 0 : next.idleMs + dtMs;
    if (menuOpen && idleMs >= MENU_TIMEOUT_MS) {
      return { ...closeList(next), item: 'vol', idleMs: 0 };
    }
    return { ...next, idleMs };
  },
});

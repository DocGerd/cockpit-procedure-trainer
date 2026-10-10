import { defineDevice } from '@cpt/core';
import type { Text } from '@cpt/core';

export const VOLUMES = ['loud', 'medium', 'quiet', 'silent'] as const;
export type FlarmVolume = (typeof VOLUMES)[number];

export const MODES = ['nearest', 'collision'] as const;
export type FlarmMode = (typeof MODES)[number];

export const SUPPLY_INPUT = 'supplyVolts';

export const BRIEF_PUSH_MS = 800;
export const LONG_PUSH_MS = 5000;

export const RING_LEDS = 10;
const STATUS_LEDS = 4;
/** Ring, then above, below and the status column, one LED per step. */
export const SELF_TEST_STEPS = RING_LEDS + 2 + STATUS_LEDS;
export const SELF_TEST_STEP_MS = 100;
export const SELF_TEST_MS = SELF_TEST_STEPS * SELF_TEST_STEP_MS;

/** One pair of ring LEDs per step, from the top to the bottom or back. */
export const CONFIRM_STEPS = RING_LEDS / 2;
export const CONFIRM_STEP_MS = SELF_TEST_STEP_MS;
export const CONFIRM_MS = CONFIRM_STEPS * CONFIRM_STEP_MS;

/** How long the receiver searches for satellites after power arrives. */
export const ACQUIRE_MS = 30_000;
export const LOW_SUPPLY_V = 8;

export const BLINK_PERIOD_MS = 1000;
export const BLINK_MS = 100;

export type FlarmStage = 'selfTest' | 'ready';
export type FlarmConfirm = {
  readonly direction: 'in' | 'out';
  readonly elapsedMs: number;
};

export type FlarmState = {
  readonly powered: boolean;
  readonly stage: FlarmStage;
  readonly stageMs: number;
  readonly fix: boolean;
  readonly acquiringMs: number;
  readonly volume: FlarmVolume;
  readonly mode: FlarmMode;
  readonly confirm: FlarmConfirm | null;
  readonly clockMs: number;
  readonly lowSupply: boolean;
  readonly operational: boolean;
  readonly held: string;
  readonly heldMs: number;
};

const text = (de: string, en: string): Text => ({ de, en });

// The key prints no word for rest or pressed, so cues name both in words.
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

const initial: FlarmState = {
  powered: false,
  stage: 'selfTest',
  stageMs: 0,
  fix: false,
  acquiringMs: 0,
  volume: 'loud',
  mode: 'nearest',
  confirm: null,
  clockMs: 0,
  lowSupply: false,
  operational: false,
  held: 'released',
  heldMs: 0,
};

const shift = <T>(list: readonly T[], value: T): T =>
  list[(list.indexOf(value) + 1) % list.length] ?? value;

const isLow = (reading: unknown): boolean =>
  typeof reading === 'number' && Number.isFinite(reading) && reading < LOW_SUPPLY_V;

export const flarmDevice = defineDevice({
  id: 'flarm',
  manual: text(
    'Externes FLARM-Display, klassische LED-Ausführung: Datenblatt V5.1e des Anzeigenherstellers und FLARM-Betriebshandbuch (Ausgabe 242); Beschreibung im Intake, Abschnitt 3.8.4',
    'External FLARM display, classic LED type: display maker data sheet V5.1e and the FLARM operating manual (version 242); intake section 3.8.4',
  ),
  notModelled: [
    text('Verkehrs- und Hindernis-Warnungen', 'Traffic and obstacle warnings'),
    text(
      'Peilung des nächsten Flugzeugs im Modus Nearest, die RX-Lampe und der Empfänger-Selbsttest',
      'The Nearest-mode bearing, the RX light and the receiver self-test',
    ),
    text('Unterdrücken der Warnungen (Doppeldruck)', 'Warning suppression (double push)'),
    text(
      'Ton: die Lautstärke wird gemerkt, aber nie gehört',
      'Sound: the volume level is kept but never heard',
    ),
    text('Die beim Start gezeigten Softwareversionen', 'The software versions shown at start-up'),
    text(
      'Neustart, Werkseinstellung und das Einrichten der Anzeige (Taste beim Einschalten gehalten)',
      'Reboot, factory reset and the display setup (Mode held at power-up)',
    ),
    text('Fehlercodes', 'Fault codes'),
    text('Flugaufzeichnung', 'Flight recording'),
  ],
  controls: {
    mode: {
      kind: 'momentary',
      positions: ['released', 'pressed'],
      initial: 'released',
      legends: keyLegends,
      name: text('Mode-Taste', 'Mode key'),
      description: text(
        'Kurz gedrückt schaltet sie die Lautstärke weiter, etwa zwei Sekunden gedrückt wechselt sie zwischen Nearest und Collision.',
        'A brief push steps the volume; a push of about two seconds swaps Nearest and Collision.',
      ),
    },
  },
  initial,
  step(state: FlarmState, { controls, powered, inputs, dtMs }): FlarmState {
    const position = String(controls.mode);
    if (!powered) {
      return {
        ...state,
        powered: false,
        stage: 'selfTest',
        stageMs: 0,
        fix: false,
        acquiringMs: 0,
        confirm: null,
        clockMs: 0,
        lowSupply: false,
        operational: false,
        held: position,
        heldMs: 0,
      };
    }

    const lowSupply = isLow(inputs[SUPPLY_INPUT]);
    if (!state.powered) {
      return {
        ...initial,
        powered: true,
        lowSupply,
        held: 'released',
        heldMs: 0,
      };
    }

    const dt = Math.max(0, dtMs);
    const testing = state.stage === 'selfTest';
    const stageMs = testing ? state.stageMs + dt : state.stageMs;
    const stage: FlarmStage = testing && stageMs >= SELF_TEST_MS ? 'ready' : state.stage;

    const acquiringMs = state.fix ? state.acquiringMs : state.acquiringMs + dt;
    const fix = state.fix || acquiringMs >= ACQUIRE_MS;

    let confirm: FlarmConfirm | null =
      state.confirm === null || state.confirm.elapsedMs + dt >= CONFIRM_MS
        ? null
        : { ...state.confirm, elapsedMs: state.confirm.elapsedMs + dt };
    let { volume, mode } = state;

    // The key counts from the moment the self-test is over, so a key held through it never fires.
    let held = 'released';
    let heldMs = 0;
    if (!testing) {
      held = position;
      const wasPressed = state.held === 'pressed';
      if (position === 'pressed') {
        heldMs = wasPressed ? Math.min(state.heldMs + dt, LONG_PUSH_MS) : 0;
      } else if (wasPressed) {
        const total = Math.min(state.heldMs + dt, LONG_PUSH_MS);
        if (total < BRIEF_PUSH_MS) {
          volume = shift(VOLUMES, volume);
        } else if (total < LONG_PUSH_MS) {
          mode = shift(MODES, mode);
          confirm = { direction: mode === 'nearest' ? 'in' : 'out', elapsedMs: 0 };
        }
      }
    }

    return {
      powered: true,
      stage,
      stageMs,
      fix,
      acquiringMs,
      volume,
      mode,
      confirm,
      clockMs: (state.clockMs + dt) % BLINK_PERIOD_MS,
      lowSupply,
      operational: stage === 'ready' && fix && !lowSupply,
      held,
      heldMs,
    };
  },
});

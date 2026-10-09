import { defineDevice } from '@cpt/core';
import type { Text } from '@cpt/core';

export const COM_MIN_KHZ = 118000;
export const COM_MAX_KHZ = 136975;
export const COM_SPACING_KHZ = 25;

const KHZ_PER_MHZ = 1000;
const MIN_MHZ = COM_MIN_KHZ / KHZ_PER_MHZ;
const MAX_MHZ = Math.floor(COM_MAX_KHZ / KHZ_PER_MHZ);

export type Sl40Knobs = {
  readonly coarse: string;
  readonly fine: string;
  readonly swap: string;
  readonly monitor: string;
};

export type Sl40State = {
  readonly active: number;
  readonly standby: number;
  readonly volume: number;
  readonly monitoring: boolean;
  readonly held: Sl40Knobs;
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

const wrap = (value: number, min: number, max: number): number =>
  value > max ? min : value < min ? max : value;

const direction = (position: string): number =>
  position === 'up' ? 1 : position === 'down' ? -1 : 0;

function coarse(standby: number, steps: number): number {
  const mhz = Math.floor(standby / KHZ_PER_MHZ);
  return wrap(mhz + steps, MIN_MHZ, MAX_MHZ) * KHZ_PER_MHZ + (standby % KHZ_PER_MHZ);
}

function fine(standby: number, steps: number): number {
  const mhz = Math.floor(standby / KHZ_PER_MHZ);
  const channels = KHZ_PER_MHZ / COM_SPACING_KHZ;
  const channel = (standby % KHZ_PER_MHZ) / COM_SPACING_KHZ;
  return mhz * KHZ_PER_MHZ + wrap(channel + steps, 0, channels - 1) * COM_SPACING_KHZ;
}

export const formatFrequency = (khz: number): string => (khz / KHZ_PER_MHZ).toFixed(3);

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

const initial: Sl40State = {
  active: 118000,
  standby: 119000,
  volume: 0.5,
  monitoring: false,
  held: { coarse: 'rest', fine: 'rest', swap: 'released', monitor: 'released' },
};

export const sl40Device = defineDevice({
  id: 'sl40',
  manual: text(
    'Garmin SL40, Bedienung nach allgemeinem Wissen über UKW-Funkgeräte; Revision des Handbuchs nicht ermittelt',
    'Garmin SL40, operation from general knowledge of VHF COM radios; manual revision not identified',
  ),
  notModelled: [
    text('Audio und Lautstärkewirkung', 'Audio and the effect of the volume setting'),
    text('Empfang, Reichweite und Squelch', 'Reception, range and squelch'),
    text('Bordsprechanlage', 'Intercom'),
    text('Speicherkanäle und Nutzerfrequenzen', 'Memory channels and user frequencies'),
    text('Squelch-Test', 'Squelch test'),
    text('Sendebetrieb und Sendeanzeige', 'Transmit operation and transmit indication'),
    text('Frequenzdatenbank und Stationsnamen', 'Frequency database and station names'),
    text('8,33-kHz-Kanalraster', '8.33 kHz channel spacing'),
    text('Beleuchtung und Dimmen', 'Display lighting and dimming'),
  ],
  controls: {
    volume: {
      kind: 'lever',
      positions: 'continuous',
      initial: initial.volume,
      name: text('Lautstärke', 'Volume'),
      description: text('Stellt die Lautstärke des Funkgeräts ein.', 'Sets the radio volume.'),
    },
    coarse: knob(
      text('Grobabstimmung', 'Coarse knob'),
      text(
        'Ändert die Bereitschaftsfrequenz in MHz-Schritten.',
        'Changes the standby frequency in MHz steps.',
      ),
    ),
    fine: knob(
      text('Feinabstimmung', 'Fine knob'),
      text(
        'Ändert die Bereitschaftsfrequenz in Kanalschritten.',
        'Changes the standby frequency in channel steps.',
      ),
    ),
    swap: {
      kind: 'momentary',
      positions: ['released', 'pressed'],
      initial: 'released',
      legends: keyLegends,
      name: text('Tausch', 'Swap'),
      description: text(
        'Tauscht aktive und Bereitschaftsfrequenz.',
        'Exchanges the active and standby frequencies.',
      ),
    },
    monitor: {
      kind: 'momentary',
      positions: ['released', 'pressed'],
      initial: 'released',
      legends: keyLegends,
      name: text('Mithören', 'Monitor'),
      description: text(
        'Hört die Bereitschaftsfrequenz mit, solange die Taste gedrückt ist.',
        'Listens to the standby frequency while the button is held.',
      ),
    },
  },
  initial,
  step(state: Sl40State, { controls, powered }): Sl40State {
    const held: Sl40Knobs = {
      coarse: String(controls.coarse),
      fine: String(controls.fine),
      swap: String(controls.swap),
      monitor: String(controls.monitor),
    };
    if (!powered) return { ...state, monitoring: false, held };

    const pressed = (now: string, before: string): boolean => now !== before && now !== 'rest';
    let standby = state.standby;
    if (pressed(held.coarse, state.held.coarse)) standby = coarse(standby, direction(held.coarse));
    if (pressed(held.fine, state.held.fine)) standby = fine(standby, direction(held.fine));

    let active = state.active;
    if (held.swap === 'pressed' && state.held.swap !== 'pressed') {
      [active, standby] = [standby, active];
    }

    const volume =
      typeof controls.volume === 'number'
        ? Math.min(1, Math.max(0, controls.volume))
        : state.volume;
    return { active, standby, volume, monitoring: held.monitor === 'pressed', held };
  },
});

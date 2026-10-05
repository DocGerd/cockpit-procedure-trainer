import { defineDevice } from '@cpt/core';
import type { Text } from '@cpt/core';

export const COM_MIN_KHZ = 118000;
export const COM_MAX_KHZ = 136975;
export const COM_SPACING_KHZ = 25;

const KHZ_PER_MHZ = 1000;
const MIN_MHZ = COM_MIN_KHZ / KHZ_PER_MHZ;
const MAX_MHZ = Math.floor(COM_MAX_KHZ / KHZ_PER_MHZ);

export type ComKnobs = {
  readonly coarse: string;
  readonly fine: string;
  readonly swap: string;
};

export type ComState = {
  readonly active: number;
  readonly standby: number;
  readonly volume: number;
  readonly held: ComKnobs;
};

const text = (de: string, en: string): Text => ({ de, en });

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
    name,
    description,
  }) as const;

const initial: ComState = {
  active: 118000,
  standby: 119000,
  volume: 0.5,
  held: { coarse: 'rest', fine: 'rest', swap: 'released' },
};

export const comDevice = defineDevice({
  id: 'com',
  manual: text(
    'Generisches Gerät, kein Herstellerhandbuch',
    'Generic unit, no manufacturer manual',
  ),
  notModelled: [
    text('Audio und Lautstärkewirkung', 'Audio and the effect of the volume setting'),
    text('Empfang, Reichweite und Squelch', 'Reception, range and squelch'),
    text('Bordsprechanlage', 'Intercom'),
    text('Speicherkanäle', 'Memory channels'),
    text('Frequenzdatenbank und Stationsnamen', 'Frequency database and station names'),
    text('8,33-kHz-Kanalraster', '8.33 kHz channel spacing'),
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
      name: text('Tausch', 'Swap'),
      description: text(
        'Tauscht aktive und Bereitschaftsfrequenz.',
        'Exchanges the active and standby frequencies.',
      ),
    },
  },
  initial,
  step(state: ComState, { controls, powered }): ComState {
    const held: ComKnobs = {
      coarse: String(controls.coarse),
      fine: String(controls.fine),
      swap: String(controls.swap),
    };
    if (!powered) return { ...state, held };

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
    return { active, standby, volume, held };
  },
});

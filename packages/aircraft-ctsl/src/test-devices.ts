import { defineDevice } from '@cpt/core';
import type { Device, Text } from '@cpt/core';

const text = (de: string, en: string): Text => ({ de, en });

const momentary = (name: Text) =>
  ({
    kind: 'momentary',
    positions: ['released', 'pressed'],
    initial: 'released',
    name,
    description: name,
  }) as const;

const knob = (name: Text) =>
  ({
    kind: 'rotary',
    positions: ['rest', 'down', 'up'],
    initial: 'rest',
    springBack: { down: 'rest', up: 'rest' },
    name,
    description: name,
  }) as const;

const sl40StandIn = defineDevice({
  id: 'sl40',
  manual: text('Platzhalter für Tests', 'Test stand-in'),
  notModelled: [text('alles', 'everything')],
  controls: {
    volume: {
      kind: 'lever',
      positions: 'continuous',
      initial: 0.5,
      name: text('Lautstärke', 'Volume'),
      description: text('Lautstärke', 'Volume'),
    },
    coarse: knob(text('Grobabstimmung', 'Coarse knob')),
    fine: knob(text('Feinabstimmung', 'Fine knob')),
    swap: momentary(text('Tausch', 'Swap')),
    monitor: momentary(text('Mithören', 'Monitor')),
  },
  initial: {},
  step: (state) => state,
});

// An aircraft depends on core only, so its tests install stand-ins that share the control ids of
// the real devices. Each device task adds its stand-in here.
export const testDevices: readonly Device[] = [sl40StandIn as Device];

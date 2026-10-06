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

const gtx327Keys = [
  ['key0', 'Ziffer 0', 'Digit 0'],
  ['key1', 'Ziffer 1', 'Digit 1'],
  ['key2', 'Ziffer 2', 'Digit 2'],
  ['key3', 'Ziffer 3', 'Digit 3'],
  ['key4', 'Ziffer 4', 'Digit 4'],
  ['key5', 'Ziffer 5', 'Digit 5'],
  ['key6', 'Ziffer 6', 'Digit 6'],
  ['key7', 'Ziffer 7', 'Digit 7'],
  ['clr', 'Löschen', 'Clear'],
  ['crsr', 'Cursor', 'Cursor'],
  ['vfr', 'VFR', 'VFR'],
  ['ident', 'Ident', 'Ident'],
  ['func', 'Funktion', 'Function'],
  ['startStop', 'Start/Stopp', 'Start/Stop'],
] as const;

const gtx327StandIn = defineDevice({
  id: 'gtx327',
  manual: text('Platzhalter für Tests', 'Test stand-in'),
  notModelled: [text('alles', 'everything')],
  controls: {
    mode: {
      kind: 'rotary',
      positions: ['off', 'sby', 'tst', 'gnd', 'on', 'alt'],
      initial: 'off',
      name: text('Betriebsart', 'Mode'),
      description: text('Betriebsart', 'Mode'),
    },
    ...Object.fromEntries(gtx327Keys.map(([id, de, en]) => [id, momentary(text(de, en))])),
  },
  initial: {},
  step: (state) => state,
});

// An aircraft depends on core only, so its tests install stand-ins that share the control ids of
// the real devices. Each device task adds its stand-in here.
export const testDevices: readonly Device[] = [sl40StandIn as Device, gtx327StandIn as Device];

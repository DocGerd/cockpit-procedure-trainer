import { defineDevice } from '@cpt/core';
import type { Text } from '@cpt/core';

// An aircraft depends on core only, so its tests install stand-ins that share the control ids of
// the real COM radio and transponder and keep just the behaviour the demo procedures read.

const text = (de: string, en: string): Text => ({ de, en });
const label = { name: text('Test', 'Test'), description: text('Test', 'Test') };

const knob = {
  kind: 'rotary',
  positions: ['rest', 'down', 'up'],
  initial: 'rest',
  springBack: { down: 'rest', up: 'rest' },
  ...label,
} as const;

const digit = {
  kind: 'rotary',
  positions: ['0', '1', '2', '3', '4', '5', '6', '7'],
  initial: '0',
  ...label,
} as const;

type ComStub = { active: number; standby: number; coarse: string; swap: string };

const com = defineDevice({
  id: 'com',
  manual: text('Test', 'Test'),
  notModelled: [],
  controls: {
    volume: { kind: 'lever', positions: 'continuous', initial: 0.5, ...label },
    coarse: knob,
    fine: knob,
    swap: {
      kind: 'momentary',
      positions: ['released', 'pressed'],
      initial: 'released',
      ...label,
    },
  },
  initial: { active: 118000, standby: 119000, coarse: 'rest', swap: 'released' } as ComStub,
  step: (state: ComStub, { controls, powered }): ComStub => {
    const coarse = String(controls.coarse);
    const swap = String(controls.swap);
    if (!powered) return { ...state, coarse, swap };
    const raised = coarse === 'up' && state.coarse !== 'up';
    const swapped = swap === 'pressed' && state.swap !== 'pressed';
    const standby = state.standby + (raised ? 1000 : 0);
    return swapped
      ? { active: standby, standby: state.active, coarse, swap }
      : { ...state, standby, coarse, swap };
  },
});

type TransponderStub = { mode: string; squawk: string; altitude: number | null };

const transponder = defineDevice({
  id: 'transponder',
  manual: text('Test', 'Test'),
  notModelled: [],
  controls: {
    mode: {
      kind: 'rotary',
      positions: ['off', 'stby', 'on', 'alt'],
      initial: 'off',
      ...label,
    },
    code1: { ...digit, initial: '7' },
    code2: digit,
    code3: digit,
    code4: digit,
    ident: {
      kind: 'momentary',
      positions: ['released', 'pressed'],
      initial: 'released',
      ...label,
    },
  },
  initial: { mode: 'off', squawk: '7000', altitude: null } as TransponderStub,
  step: (state: TransponderStub, { controls, powered, inputs }): TransponderStub => {
    if (!powered) return { ...state, altitude: null };
    const mode = String(controls.mode);
    const reading = inputs.pressureAltitude;
    return {
      mode,
      squawk: [controls.code1, controls.code2, controls.code3, controls.code4].join(''),
      altitude: mode === 'alt' && typeof reading === 'number' ? reading : null,
    };
  },
});

export const testDevices = [com, transponder];

import { defineAircraft, defineDevice } from '@cpt/core';
import type { Aircraft, Environment, Text } from '@cpt/core';
import type { DeviceDisplayProps, DeviceScreenEntry, DeviceScreenProps } from '@cpt/panel-kit';
import { createElement } from 'react';

// Test-only fixtures, so mode tests do not depend on the registered aircraft's content.

type State = Record<string, never>;

const text = (en: string): Text => ({ de: `${en} (de)`, en });
const environment: Environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };
const initial: State = {};

const toggle = (name: string) => ({
  kind: 'toggle' as const,
  positions: ['off', 'on'] as const,
  initial: 'off' as const,
  name: text(name),
  description: text(`Turns the ${name.toLowerCase()} on or off.`),
});

export const radio = defineDevice({
  id: 'modes-radio',
  manual: text('Fixture manual'),
  notModelled: [],
  controls: {
    page: {
      kind: 'rotary',
      positions: ['a', 'b'],
      initial: 'a',
      name: text('Page'),
      description: text('Selects the page.'),
    },
    spare: {
      kind: 'rotary',
      positions: ['a', 'b'],
      initial: 'a',
      name: text('Spare'),
      description: text('Has no key on the screen.'),
    },
  },
  initial: {},
  step: (state) => state,
});

export function RadioScreen({ send }: DeviceScreenProps) {
  return createElement(
    'button',
    {
      type: 'button',
      'data-control': 'page',
      'data-position': 'b',
      onClick: () => send('page', 'set', 'b'),
    },
    'Radio page B',
  );
}

export const radioEntry: DeviceScreenEntry = {
  Screen: RadioScreen,
  Display: ({ on }: DeviceDisplayProps) => createElement('output', null, on ? 'on' : ''),
  readout: () => 'Radio page A',
  floor: { width: 100, height: 50 },
};

export const fixture: Aircraft = defineAircraft({
  id: 'modes-fixture',
  name: text('Modes fixture'),
  handbookRevision: text('test'),
  controls: {
    master: toggle('Master'),
    pump: toggle('Pump'),
    starter: {
      kind: 'momentary',
      positions: ['off', 'start'],
      initial: 'off',
      name: text('Starter'),
      description: text('Cranks the engine while held.'),
    },
    unplaced: toggle('Unplaced'),
    throttle: {
      kind: 'lever',
      positions: 'continuous',
      initial: 0,
      name: text('Throttle'),
      description: text('Sets the power.'),
    },
    cutoff: {
      kind: 'guarded',
      positions: ['normal', 'cut'],
      initial: 'normal',
      guard: { name: text('Cutoff guard') },
      name: text('Fuel cutoff'),
      description: text('Shuts off the fuel.'),
    },
  },
  indicators: {
    volts: {
      name: text('Volts'),
      select: (state) => (state.controls.master === 'on' ? 14 : 0),
      appearance: { widget: 'round-gauge', options: { min: 0, max: 30, units: 'V' } },
    },
  },
  views: {
    main: {
      name: text('Main panel'),
      image: 'main.png',
      controls: {
        master: { rect: { x: 100, y: 100, w: 100, h: 100 } },
        starter: { rect: { x: 300, y: 100, w: 100, h: 100 } },
        cutoff: { rect: { x: 450, y: 150, w: 100, h: 50 } },
        throttle: { rect: { x: 850, y: 100, w: 50, h: 150 } },
      },
      indicators: { volts: { rect: { x: 600, y: 100, w: 200, h: 200 } } },
    },
    console: {
      name: text('Centre console'),
      image: 'console.png',
      controls: { pump: { rect: { x: 0, y: 0, w: 250, h: 250 } } },
    },
  },
  devices: {
    com: {
      device: 'modes-radio',
      view: 'console',
      placement: { rect: { x: 500, y: 0, w: 400, h: 200 } },
      powered: () => true,
      inputs: {},
    },
  },
  systems: { initial, step: (state: State) => state },
  failures: {},
  phases: {
    ground: {
      name: text('Ground'),
      image: 'ground.png',
      environment,
      entry: {
        controls: {
          master: 'off',
          pump: 'off',
          starter: 'off',
          unplaced: 'off',
          cutoff: 'normal',
          throttle: 0,
        },
        state: initial,
      },
    },
  },
  procedures: {
    start: {
      title: text('Start'),
      type: 'normal',
      startPhase: 'ground',
      items: [
        { type: 'action', control: 'master', position: 'on', text: text('Master on') },
        { type: 'action', control: 'pump', position: 'on', text: text('Pump on') },
        {
          type: 'check',
          target: { indicator: 'volts' },
          condition: (state) => state.controls.master === 'on',
          text: text('Volts shown'),
        },
        { type: 'action', control: 'com.page', position: 'b', text: text('Radio page b') },
        { type: 'confirm', text: text('Ready') },
      ],
    },
    cycle: {
      title: text('Cycle'),
      type: 'normal',
      startPhase: 'ground',
      items: [
        { type: 'action', control: 'master', position: 'on', text: text('Master on') },
        { type: 'action', control: 'master', position: 'off', text: text('Master off') },
      ],
    },
    inview: {
      title: text('In view'),
      type: 'normal',
      startPhase: 'ground',
      items: [
        { type: 'action', control: 'cutoff', position: 'cut', text: text('Cutoff cut') },
        { type: 'action', control: 'throttle', position: 1, text: text('Throttle full') },
      ],
    },
    scan: {
      title: text('Scan'),
      type: 'normal',
      startPhase: 'ground',
      items: [
        { type: 'action', flow: true, control: 'cutoff', position: 'cut', text: text('Cutoff') },
        { type: 'action', flow: true, control: 'pump', position: 'on', text: text('Pump') },
        { type: 'action', flow: true, control: 'unplaced', position: 'on', text: text('Unplaced') },
        { type: 'action', control: 'cutoff', position: 'cut', text: text('Cutoff verified') },
        { type: 'action', control: 'pump', position: 'on', text: text('Pump verified') },
        { type: 'action', control: 'unplaced', position: 'on', text: text('Unplaced verified') },
      ],
    },
    scanBack: {
      title: text('Scan back'),
      type: 'normal',
      startPhase: 'ground',
      items: [
        { type: 'action', flow: true, control: 'throttle', position: 1, text: text('Throttle') },
        { type: 'action', flow: true, control: 'pump', position: 'on', text: text('Pump') },
        { type: 'action', flow: true, control: 'cutoff', position: 'cut', text: text('Cutoff') },
        { type: 'action', control: 'pump', position: 'on', text: text('Pump verified') },
      ],
    },
    keyless: {
      title: text('Keyless'),
      type: 'normal',
      startPhase: 'ground',
      items: [{ type: 'action', control: 'com.spare', position: 'b', text: text('Spare b') }],
    },
    shutdown: {
      title: text('Shutdown'),
      type: 'normal',
      startPhase: 'ground',
      items: [
        { type: 'action', control: 'pump', position: 'off', text: text('Pump off') },
        {
          type: 'check',
          target: { control: 'master' },
          condition: (state) => state.controls.master === 'off',
          text: text('Master off'),
        },
      ],
    },
  },
});

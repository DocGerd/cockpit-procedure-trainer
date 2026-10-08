import { defineAircraft, defineDevice, everyPhase } from '@cpt/core';
import type { Aircraft, Device, Environment, Text, TrainerState } from '@cpt/core';
import type { DeviceDisplayProps, DeviceScreenEntry, DeviceScreenProps } from '@cpt/panel-kit';
import type { ComponentType } from 'react';

// Test-only: a fixture device, screen and aircraft, so device tests do not depend on a package.

const text = (en: string): Text => ({ de: `${en} (de)`, en });
const environment: Environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };
const systems = { initial: {}, step: (state: object) => state };

export type FixtureDeviceState = { readonly page: string; readonly keyDown: boolean };

const fixtureControls = {
  page: {
    kind: 'rotary',
    positions: ['a', 'b'],
    initial: 'a',
    name: text('Page'),
    description: text('Page'),
  },
  key: {
    kind: 'momentary',
    positions: ['up', 'down'],
    initial: 'up',
    name: text('Key'),
    description: text('Key'),
  },
  knob: {
    kind: 'rotary',
    positions: ['rest', 'left', 'right'],
    initial: 'rest',
    springBack: { left: 'rest', right: 'rest' },
    name: text('Knob'),
    description: text('Knob'),
  },
} as const;

const fixtureDevice = defineDevice({
  id: 'fixture-radio',
  manual: text('Fixture'),
  notModelled: [],
  controls: fixtureControls,
  initial: { page: 'a', keyDown: false } as FixtureDeviceState,
  step: (_state, { controls }): FixtureDeviceState => ({
    page: String(controls.page),
    keyDown: controls.key === 'down',
  }),
});

const unscreenedDevice = defineDevice({
  id: 'fixture-unscreened',
  manual: text('Fixture'),
  notModelled: [],
  controls: {},
  initial: {},
  step: (state) => state,
});

export const devices: readonly Device[] = [fixtureDevice, unscreenedDevice];

export const screenInput: { send?: DeviceScreenProps['send'] } = {};

export function FixtureScreen({ on, state, send }: DeviceScreenProps) {
  const { page, keyDown } = state as FixtureDeviceState;
  screenInput.send = send;
  return (
    <div>
      <output data-readout>{on ? `${page}${keyDown ? '!' : ''}` : ''}</output>
      <button type="button" onClick={() => send('page', 'set', 'b')}>
        Page B
      </button>
      <button type="button" onClick={() => send('key', 'press')}>
        Key down
      </button>
      <button type="button" onClick={() => send('key', 'release')}>
        Key up
      </button>
      <button type="button" onClick={() => send('knob', 'press', 'right')}>
        Knob right
      </button>
      <button type="button" onClick={() => send('knob', 'release')}>
        Knob release
      </button>
    </div>
  );
}

export function FixtureDisplay({ on, state }: DeviceDisplayProps) {
  const { page } = state as FixtureDeviceState;
  return <output data-mirror-page>{on ? page : ''}</output>;
}

export const deviceEntries: Readonly<Record<string, DeviceScreenEntry>> = {
  'fixture-radio': {
    Screen: FixtureScreen,
    Display: FixtureDisplay,
    readout: (state, language, on) =>
      on ? `${language === 'de' ? 'Seite' : 'Page'} ${(state as FixtureDeviceState).page}` : 'Off',
    floor: { width: 100, height: 50 },
  },
};

export const deviceScreens: Readonly<Record<string, ComponentType<DeviceScreenProps>>> = {
  'fixture-radio': FixtureScreen,
};

const powered = (state: TrainerState<unknown>) => state.controls.bus === 'on';
const place = (x: number) => ({ rect: { x, y: 0, w: 100, h: 50 } });

export const aircraft: Aircraft = defineAircraft({
  id: 'device-fixture',
  name: text('Device fixture'),
  handbookRevision: text('test'),
  controls: {
    bus: {
      kind: 'toggle',
      positions: ['off', 'on'],
      initial: 'off',
      name: text('Bus'),
      description: text('Bus'),
    },
  },
  indicators: {},
  views: {
    main: { name: text('Main'), image: 'main.png' },
    side: { name: text('Side'), image: 'side.png' },
  },
  devices: {
    radio: {
      device: 'fixture-radio',
      view: 'main',
      placement: place(100),
      powered,
      inputs: {},
    },
    spare: {
      device: 'fixture-unscreened',
      view: 'main',
      placement: place(400),
      powered,
      inputs: {},
    },
    far: {
      device: 'fixture-radio',
      view: 'side',
      placement: place(100),
      powered,
      inputs: {},
    },
  },
  systems,
  failures: {},
  phases: everyPhase({
    image: 'ground.png',
    environment,
    entry: { controls: { bus: 'off' }, state: {} },
  }),
  procedures: {},
});

import { defineAircraft } from '@cpt/core';
import type { Aircraft, Environment, Text } from '@cpt/core';

// Test-only fixtures, so panel tests do not depend on the registered aircraft's content.

type State = Record<string, never>;

const text = (en: string): Text => ({ de: `${en} (de)`, en });
const environment: Environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };
const initial: State = {};
const systems = { initial, step: (state: State) => state };

const toggle = (name: string) => ({
  kind: 'toggle' as const,
  positions: ['off', 'on'] as const,
  initial: 'off' as const,
  name: text(name),
  description: text(`${name} switch`),
});

export const IMAGE = { width: 1000, height: 500 };

export const fixture: Aircraft = defineAircraft({
  id: 'panel-fixture',
  name: text('Panel fixture'),
  handbookRevision: text('test'),
  controls: {
    master: toggle('Master'),
    pump: { ...toggle('Pump'), appearance: { widget: 'not-a-widget', options: { cap: 'red' } } },
    beacon: {
      ...toggle('Beacon'),
      appearance: {
        artwork: {
          face: 'beacon-face.png',
          moving: { type: 'positions', images: { off: 'beacon-off.png', on: 'beacon-on.png' } },
        },
      },
    },
    cb: {
      kind: 'breaker',
      positions: ['in', 'pulled'],
      initial: 'in',
      name: text('Bus breaker'),
      description: text('Bus breaker'),
    },
    starter: {
      kind: 'momentary',
      positions: ['off', 'start'],
      initial: 'off',
      name: text('Starter'),
      description: text('Starter'),
    },
    key: {
      kind: 'rotary',
      positions: ['off', 'on', 'start'],
      initial: 'off',
      springBack: { start: 'on' },
      name: text('Key'),
      description: text('Key'),
    },
    cutoff: {
      kind: 'guarded',
      positions: ['normal', 'cut'],
      initial: 'normal',
      guard: { name: text('Cutoff guard') },
      name: text('Fuel cutoff'),
      description: text('Fuel cutoff'),
    },
  },
  indicators: {
    lowVolts: {
      name: text('Low volts'),
      select: (state) => state.controls.master === 'off',
      appearance: { widget: 'annunciator', options: { lamp: 'amber' } },
    },
    rpm: {
      name: text('RPM'),
      select: (state) => (state.controls.beacon === 'on' ? 40 : 0),
      appearance: { widget: 'round-gauge', options: { min: 0, max: 100, units: 'rpm' } },
    },
    door: {
      name: text('Door'),
      select: () => true,
      appearance: {
        widget: 'annunciator',
        options: { lamp: 'red', stateLabels: { lit: 'OPEN', dark: 'SHUT' } },
      },
    },
  },
  views: {
    main: {
      name: text('Main panel'),
      image: 'main-panel.png',
      controls: {
        master: { rect: { x: 100, y: 50, w: 100, h: 100 } },
        pump: {
          rect: { x: 300, y: 100, w: 200, h: 150 },
          position3d: { x: 1, y: 2, z: 3 },
          orientation: { x: 0, y: 90, z: 0 },
        },
        cb: { rect: { x: 600, y: 250, w: 50, h: 50 } },
        cutoff: { rect: { x: 400, y: 0, w: 100, h: 50 } },
      },
      indicators: { lowVolts: { rect: { x: 700, y: 50, w: 100, h: 50 } } },
    },
    console: {
      name: text('Centre console'),
      image: 'console.png',
      controls: {
        beacon: { rect: { x: 0, y: 0, w: 250, h: 250 } },
        starter: { rect: { x: 0, y: 300, w: 100, h: 100 } },
        key: { rect: { x: 200, y: 300, w: 100, h: 100 } },
      },
      indicators: {
        rpm: { rect: { x: 500, y: 0, w: 250, h: 250 } },
        door: { rect: { x: 500, y: 300, w: 100, h: 50 } },
      },
    },
  },
  systems,
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
          beacon: 'off',
          cb: 'in',
          cutoff: 'normal',
          starter: 'off',
          key: 'off',
        },
        state: initial,
      },
    },
  },
  procedures: {},
});

export const other: Aircraft = defineAircraft({
  id: 'panel-other',
  name: text('Other'),
  handbookRevision: text('test'),
  controls: { light: toggle('Light') },
  indicators: {},
  views: {
    deck: {
      name: text('Deck'),
      image: 'deck.png',
      controls: { light: { rect: { x: 0, y: 0, w: 10, h: 10 } } },
    },
    console: { name: text('Other console'), image: 'other-console.png' },
  },
  systems,
  failures: {},
  phases: {
    ground: {
      name: text('Ground'),
      image: 'ground.png',
      environment,
      entry: { controls: { light: 'off' }, state: initial },
    },
  },
  procedures: {},
});

export const vector: Aircraft = defineAircraft({
  id: 'panel-vector',
  name: text('Vector'),
  handbookRevision: text('test'),
  controls: { light: toggle('Light') },
  indicators: {},
  views: {
    panel: {
      name: text('Vector panel'),
      image: 'assets/vector-panel.svg?v=1',
      controls: { light: { rect: { x: 100, y: 50, w: 100, h: 100 } } },
    },
  },
  systems,
  failures: {},
  phases: {
    ground: {
      name: text('Ground'),
      image: 'ground.png',
      environment,
      entry: { controls: { light: 'off' }, state: initial },
    },
  },
  procedures: {},
});

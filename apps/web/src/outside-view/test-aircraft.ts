import { defineAircraft, everyPhase } from '@cpt/core';
import type { Aircraft, Text } from '@cpt/core';

// Test-only fixture, so these tests do not depend on a registered aircraft's content.

const text = (en: string): Text => ({ en, de: `${en} (de)` });
const environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };
const initial = {};

export const fixture: Aircraft = defineAircraft({
  id: 'fixture',
  name: text('Fixture'),
  handbookRevision: text('test'),
  controls: {
    master: {
      kind: 'toggle',
      positions: ['off', 'on'],
      initial: 'off',
      name: text('Master'),
      description: text('Master switch'),
    },
    fire: {
      kind: 'toggle',
      positions: ['off', 'on'],
      initial: 'off',
      name: text('Fire'),
      description: text('Sets a fire'),
    },
  },
  indicators: {},
  views: { main: { name: text('Main'), image: 'main.svg', controls: {} } },
  systems: { initial, step: (state: Record<string, never>) => state },
  engineRunning: (state) => state.controls['master'] === 'on',
  outsideCues: {
    smoke: {
      name: text('Smoke'),
      image: 'smoke.svg',
      shows: (state) => state.controls['fire'] === 'on',
    },
  },
  failures: {},
  phases: {
    ...everyPhase({
      image: 'ground.svg',
      imageRunning: 'ground-running.svg',
      environment,
      entry: { controls: { master: 'off', fire: 'off' }, state: initial },
    }),
    cruise: {
      image: 'cruise.svg',
      imageRunning: 'cruise-running.svg',
      environment,
      entry: { controls: { master: 'on', fire: 'off' }, state: initial },
    },
    taxiIn: {
      image: 'landed.svg',
      environment,
      entry: { controls: { master: 'off', fire: 'off' }, state: initial },
    },
  },
  procedures: {
    startUp: {
      title: text('Start up'),
      type: 'normal',
      startPhase: 'parking',
      endPhase: 'taxiIn',
      items: [{ type: 'action', control: 'master', position: 'on', text: text('Master on') }],
    },
    cycle: {
      title: text('Cycle'),
      type: 'normal',
      startPhase: 'parking',
      endPhase: 'taxiIn',
      items: [
        { type: 'action', control: 'master', position: 'on', text: text('Master on') },
        { type: 'action', control: 'master', position: 'off', text: text('Master off') },
      ],
    },
  },
});

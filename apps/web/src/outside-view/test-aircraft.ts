import { defineAircraft } from '@cpt/core';
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
  },
  indicators: {},
  views: { main: { name: text('Main'), image: 'main.svg', controls: {} } },
  systems: { initial, step: (state: Record<string, never>) => state },
  failures: {},
  phases: {
    ground: {
      name: text('Ground'),
      image: 'ground.svg',
      environment,
      entry: { controls: { master: 'off' }, state: initial },
    },
    cruise: {
      name: text('Cruise'),
      image: 'cruise.svg',
      environment,
      entry: { controls: { master: 'on' }, state: initial },
    },
    landed: {
      name: text('Landed'),
      image: 'landed.svg',
      environment,
      entry: { controls: { master: 'off' }, state: initial },
    },
  },
  procedures: {
    startUp: {
      title: text('Start up'),
      type: 'normal',
      startPhase: 'ground',
      endPhase: 'landed',
      items: [{ type: 'action', control: 'master', position: 'on', text: text('Master on') }],
    },
  },
});

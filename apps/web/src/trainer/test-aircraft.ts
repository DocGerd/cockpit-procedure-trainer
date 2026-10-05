import { defineAircraft } from '@cpt/core';
import type { Aircraft, Environment, Text } from '@cpt/core';

// Test-only fixtures, so shell tests do not depend on the registered aircraft's content.

type State = Record<string, never>;

const text = (en: string): Text => ({ de: `${en} (de)`, en });
const environment: Environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };
const initial: State = {};

function fixture(id: string, name: string, withFire: boolean): Aircraft {
  return defineAircraft({
    id,
    name: text(name),
    handbookRevision: 'test',
    controls: {
      master: {
        kind: 'toggle',
        positions: ['off', 'on'],
        initial: 'off',
        name: text('Master'),
        description: text('Master switch'),
      },
      pump: {
        kind: 'toggle',
        positions: ['off', 'on'],
        initial: 'off',
        name: text('Pump'),
        description: text('Fuel pump'),
      },
    },
    indicators: {},
    views: {
      main: { name: text('Main'), image: 'main.svg', controls: {} },
    },
    systems: { initial, step: (state: State) => state },
    failures: { fire: { name: text('Fire') } },
    phases: {
      ground: {
        name: text('Ground'),
        image: 'ground.svg',
        environment,
        entry: { controls: { master: 'off', pump: 'off' }, state: initial },
      },
    },
    procedures: {
      powerUp: {
        title: text(`${name} power up`),
        type: 'normal',
        startPhase: 'ground',
        items: [
          { type: 'action', control: 'master', position: 'on', text: text('Master on') },
          { type: 'action', control: 'pump', position: 'on', text: text('Pump on') },
        ],
      },
      ...(withFire
        ? {
            fire: {
              title: text(`${name} engine fire`),
              type: 'emergency' as const,
              failure: 'fire',
              startPhase: 'ground',
              items: [{ type: 'action', control: 'pump', position: 'off', text: text('Pump off') }],
            },
          }
        : {}),
    },
  });
}

export const testAircraft: readonly [Aircraft, Aircraft] = [
  fixture('alpha', 'Alpha', false),
  fixture('bravo', 'Bravo', true),
];

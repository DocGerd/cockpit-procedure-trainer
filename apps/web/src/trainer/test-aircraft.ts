import { defineAircraft } from '@cpt/core';
import type { Aircraft, Environment, Text } from '@cpt/core';

// Test-only fixtures, so shell tests do not depend on the registered aircraft's content.

type State = { readonly failing: boolean };

const text = (en: string): Text => ({ de: `${en} (de)`, en });
const environment: Environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };
const initial: State = { failing: false };

function fixture(id: string, name: string, withFire: boolean): Aircraft {
  return defineAircraft({
    id,
    name: text(name),
    handbookRevision: text('test'),
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
    indicators: {
      warning: {
        name: text('Warning'),
        select: (state) => state.systems.failing,
        appearance: { widget: 'text' },
      },
    },
    views: {
      main: { name: text('Main'), image: 'main.svg', controls: {} },
    },
    cockpit: {
      size: { width: 100, height: 120 },
      views: { main: { rect: { x: 0, y: 0, w: 100, h: 100 }, minWidth: 400 } },
      dock: { rect: { x: 0, y: 100, w: 100, h: 20 }, minWidth: 100 },
    },
    systems: { initial, step: (_state, input) => ({ failing: input.failures.size > 0 }) },
    failures: { fire: { name: text('Fire') } },
    phases: {
      ground: {
        name: text('Ground'),
        image: 'ground.svg',
        environment,
        entry: { controls: { master: 'off', pump: 'off' }, state: initial },
      },
      cruise: {
        name: text('Cruise'),
        image: 'cruise.svg',
        environment: { airspeedKt: 100, altitudeFt: 3000, onGround: false },
        entry: { controls: { master: 'on', pump: 'on' }, state: initial },
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

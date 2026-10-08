import { defineAircraft, everyPhase } from '@cpt/core';
import type { Aircraft, Environment, Text } from '@cpt/core';

// Test-only fixture, so checklist tests do not depend on the registered aircraft's content.

type State = { readonly failing: boolean };

const text = (en: string): Text => ({ de: `${en} (de)`, en });
const environment: Environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };
const initial: State = { failing: false };

const toggle = (name: string) => ({
  kind: 'toggle' as const,
  positions: ['off', 'on'] as const,
  initial: 'off' as const,
  name: text(name),
  description: text(`${name} switch`),
});

export const fixture: Aircraft = defineAircraft({
  id: 'checklist-fixture',
  name: text('Fixture'),
  handbookRevision: text('test'),
  controls: { master: toggle('Master'), pump: toggle('Pump'), avionics: toggle('Avionics') },
  indicators: {
    fuel: {
      name: text('Fuel'),
      select: (state) => (state.systems.failing ? 'low' : 'ok'),
      appearance: { widget: 'text' },
    },
  },
  views: { main: { name: text('Main'), image: 'main.svg', controls: {} } },
  systems: { initial, step: (_state, input) => ({ failing: input.failures.size > 0 }) },
  failures: { fire: { name: text('Fire') } },
  phases: {
    ...everyPhase({
      image: 'ground.svg',
      environment,
      entry: { controls: { master: 'off', pump: 'off', avionics: 'off' }, state: initial },
    }),
    cruise: {
      image: 'airborne.svg',
      environment: { airspeedKt: 100, altitudeFt: 3000, onGround: false },
      entry: { controls: { master: 'on', pump: 'on', avionics: 'off' }, state: initial },
    },
  },
  procedures: {
    flow: {
      title: text('Flow'),
      type: 'normal',
      startPhase: 'parking',
      items: [
        { type: 'action', control: 'master', position: 'on', text: text('Master on') },
        {
          type: 'check',
          target: { indicator: 'fuel' },
          condition: (state) => state.controls.pump === 'on',
          text: text('Fuel flowing'),
        },
        { type: 'confirm', text: text('Walk-around done') },
        { type: 'action', control: 'pump', position: 'on', text: text('Pump on') },
      ],
    },
    followUp: {
      title: text('Follow-up'),
      type: 'normal',
      startPhase: 'parking',
      items: [{ type: 'action', control: 'avionics', position: 'on', text: text('Avionics on') }],
    },
    fire: {
      title: text('Fire'),
      type: 'emergency',
      failure: 'fire',
      startPhase: 'cruise',
      items: [{ type: 'action', control: 'pump', position: 'off', text: text('Pump off') }],
    },
  },
});

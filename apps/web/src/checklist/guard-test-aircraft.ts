import { defineAircraft, everyPhase } from '@cpt/core';
import type { Aircraft, Text } from '@cpt/core';

// Test-only fixture: a guard with its own words and one without, each with a one-item procedure.

const text = (en: string): Text => ({ de: `${en} (de)`, en });

export const pinned: Aircraft = defineAircraft({
  id: 'guard-fixture',
  name: text('Guard fixture'),
  handbookRevision: text('test'),
  controls: {
    rescue: {
      kind: 'guarded',
      positions: ['stowed', 'pulled'],
      initial: 'stowed',
      guard: {
        name: text('Safety pin'),
        legends: {
          open: { state: text('removed'), act: text('Remove the safety pin') },
          closed: { state: text('in'), act: text('Fit the safety pin') },
        },
      },
      name: text('Rescue'),
      description: text('Rescue handle'),
    },
    cutoff: {
      kind: 'guarded',
      positions: ['open', 'shut'],
      initial: 'open',
      guard: { name: text('Cover') },
      name: text('Cutoff'),
      description: text('Fuel cutoff'),
    },
  },
  indicators: {},
  views: { main: { name: text('Main'), image: 'main.svg', controls: {} } },
  systems: { initial: {}, step: (state) => state },
  failures: {},
  phases: everyPhase({
    image: 'ground.svg',
    environment: { airspeedKt: 0, altitudeFt: 0, onGround: true },
    entry: { controls: { rescue: 'stowed', cutoff: 'open' }, state: {} },
  }),
  procedures: {
    pin: {
      title: text('Pin'),
      type: 'normal',
      startPhase: 'parking',
      items: [{ type: 'guard', control: 'rescue', position: 'open', text: text('Pin out') }],
    },
    cover: {
      title: text('Cover'),
      type: 'normal',
      startPhase: 'parking',
      items: [{ type: 'guard', control: 'cutoff', position: 'open', text: text('Cover open') }],
    },
  },
});

import { defineAircraft, everyPhase } from '@cpt/core';
import type { Aircraft, Text } from '@cpt/core';

// Test-only fixture: one guarded control and a procedure of one guard item.

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
      guard: { name: text('Safety pin') },
      name: text('Rescue'),
      description: text('Rescue handle'),
    },
  },
  indicators: {},
  views: { main: { name: text('Main'), image: 'main.svg', controls: {} } },
  systems: { initial: {}, step: (state) => state },
  failures: {},
  phases: everyPhase({
    image: 'ground.svg',
    environment: { airspeedKt: 0, altitudeFt: 0, onGround: true },
    entry: { controls: { rescue: 'stowed' }, state: {} },
  }),
  procedures: {
    pin: {
      title: text('Pin'),
      type: 'normal',
      startPhase: 'parking',
      items: [{ type: 'guard', control: 'rescue', position: 'open', text: text('Pin out') }],
    },
  },
});

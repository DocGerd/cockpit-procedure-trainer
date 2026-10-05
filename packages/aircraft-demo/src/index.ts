import { defineAircraft } from '@cpt/core';
import type { Environment, Text } from '@cpt/core';

type DemoState = Record<string, never>;

const text = (de: string, en: string): Text => ({ de, en });

const environment: Environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };

const initial: DemoState = {};

export const demoAircraft = defineAircraft({
  id: 'demo',
  name: text('Demo-Flugzeug', 'Demo aircraft'),
  handbookRevision: 'none, placeholder content',
  controls: {
    breaker: {
      kind: 'breaker',
      positions: ['in', 'pulled'],
      initial: 'pulled',
      name: text('Sicherung', 'Breaker'),
      description: text('Eine Platzhalter-Sicherung.', 'A placeholder breaker.'),
    },
  },
  indicators: {},
  views: {
    panel: {
      name: text('Instrumententafel', 'Panel'),
      image: new URL('./panel.svg', import.meta.url).href,
      controls: { breaker: { rect: { x: 60, y: 30, w: 40, h: 30 } } },
    },
  },
  systems: { initial, step: (state: DemoState) => state },
  failures: {},
  phases: {
    parking: {
      name: text('Parkposition', 'Parking'),
      image: new URL('./parking.svg', import.meta.url).href,
      environment,
      entry: { controls: { breaker: 'pulled' }, state: initial },
    },
  },
  procedures: {
    resetBreaker: {
      title: text('Sicherung eindrücken', 'Reset the breaker'),
      type: 'normal',
      startPhase: 'parking',
      items: [
        {
          type: 'action',
          control: 'breaker',
          position: 'in',
          text: text('Sicherung eindrücken', 'Push the breaker in'),
        },
      ],
    },
  },
});

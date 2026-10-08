import type { OutsideCue } from '@cpt/core';
import { images } from './assets';
import type { CtslState } from './systems';
import { text } from './text';

export const outsideCues = {
  engineSmoke: {
    name: text('Rauch aus dem Motorraum', 'Smoke from the engine bay'),
    image: images.engineSmoke,
    shows: (state) => state.systems.fire,
  },
} as const satisfies Record<string, OutsideCue<CtslState>>;

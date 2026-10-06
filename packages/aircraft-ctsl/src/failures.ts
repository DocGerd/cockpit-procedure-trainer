import type { FailureDefinition } from '@cpt/core';
import { text } from './text';

export const failures = {
  generatorFailure: { name: text('Generatorausfall', 'Generator failure') },
  engineStoppage: { name: text('Triebwerksausfall', 'Engine stoppage') },
  engineFire: { name: text('Triebwerksbrand', 'Engine fire') },
  coolantLoss: { name: text('Kühlmittelverlust', 'Coolant loss') },
  oilLoss: { name: text('Ölverlust', 'Oil loss') },
  flapControlFailure: { name: text('Ausfall der Klappensteuerung', 'Flap control failure') },
} as const satisfies Record<string, FailureDefinition<never>>;

export type CtslFailure = keyof typeof failures;

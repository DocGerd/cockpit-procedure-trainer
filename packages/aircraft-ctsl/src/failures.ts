import type { BreakerId, FailureDefinition } from '@cpt/core';
import type { controls } from './controls';
import { text } from './text';

export const failures = {
  generatorFailure: { name: text('Generatorausfall', 'Generator failure') },
  engineStoppage: { name: text('Triebwerksausfall', 'Engine stoppage') },
  engineFire: { name: text('Triebwerksbrand', 'Engine fire') },
  coolantLoss: { name: text('Kühlmittelverlust', 'Coolant loss') },
  oilLoss: { name: text('Ölverlust', 'Oil loss') },
  // Assumed (unverified), intake §9: the failed controller overloads the drive and its thermal
  // breaker trips, so the readout on that circuit goes dark.
  flapControlFailure: {
    name: text('Ausfall der Klappensteuerung', 'Flap control failure'),
    trips: ['flapBreaker'],
  },
} as const satisfies Record<string, FailureDefinition<BreakerId<typeof controls>>>;

export type CtslFailure = keyof typeof failures;

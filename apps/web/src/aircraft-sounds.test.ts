import type { Aircraft, TrainerState } from '@cpt/core';
import { voiceFactories } from '@cpt/panel-kit';
import { describe, expect, it } from 'vitest';
import { aircraftRegistry } from './aircraft-registry';

const declared = (aircraft: Aircraft) => Object.entries(aircraft.sounds ?? {});

const entryStates = (aircraft: Aircraft): readonly TrainerState<unknown>[] => [
  {
    controls: Object.fromEntries(
      Object.entries(aircraft.controls).map(([id, control]) => [id, control.initial]),
    ),
    guards: {},
    systems: aircraft.systems.initial,
    devices: {},
  },
  ...Object.values(aircraft.phases).map((phase) => ({
    controls: phase.entry.controls,
    guards: {},
    systems: phase.entry.state,
    devices: {},
  })),
];

describe('aircraft sounds', () => {
  it.each(aircraftRegistry.map((aircraft) => [aircraft.id, aircraft] as const))(
    '%s declares only voice ids the panel kit provides',
    (_id, aircraft) => {
      const unknown = declared(aircraft).flatMap(([id, { voice }]) =>
        Object.hasOwn(voiceFactories, voice) ? [] : [`${id}: ${voice}`],
      );
      expect(unknown).toEqual([]);
    },
  );

  it.each(aircraftRegistry.map((aircraft) => [aircraft.id, aircraft] as const))(
    '%s gives every voice options it accepts',
    (_id, aircraft) => {
      const problems = declared(aircraft).flatMap(([id, { voice, options }]) =>
        (voiceFactories[voice]?.problems(options ?? {}) ?? []).map(
          (problem) => `${id}: ${problem}`,
        ),
      );
      expect(problems).toEqual([]);
    },
  );

  it.each(aircraftRegistry.map((aircraft) => [aircraft.id, aircraft] as const))(
    '%s has selectors that give a finite number on every entry state',
    (_id, aircraft) => {
      const failures: string[] = [];
      for (const [id, { inputs }] of declared(aircraft)) {
        for (const [name, select] of Object.entries(inputs ?? {})) {
          for (const state of entryStates(aircraft)) {
            try {
              const value = select(state);
              if (!Number.isFinite(value)) failures.push(`${id}.${name}: gave ${value}`);
            } catch (error) {
              failures.push(`${id}.${name}: threw on an entry state: ${String(error)}`);
            }
          }
        }
      }
      expect(failures).toEqual([]);
    },
  );

  it('keeps the demo silent but for the shared control clicks', () => {
    const demo = aircraftRegistry.find((aircraft) => aircraft.id === 'demo');
    expect(demo).toBeDefined();
    expect(demo?.sounds).toBeUndefined();
  });

  it('uses every panel-kit voice in a registered aircraft', () => {
    const voices = new Set(
      aircraftRegistry.flatMap((aircraft) => declared(aircraft).map(([, { voice }]) => voice)),
    );
    expect(Object.keys(voiceFactories).filter((voice) => !voices.has(voice))).toEqual([]);
  });
});

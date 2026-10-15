import { createSession } from '@cpt/core';
import type { Aircraft, TrainerState } from '@cpt/core';
import { voiceFactories } from '@cpt/panel-kit';
import { describe, expect, it } from 'vitest';
import { aircraftRegistry } from './aircraft-registry';
import { deviceRegistry } from './device-registry';

const declared = (aircraft: Aircraft) => Object.entries(aircraft.sounds ?? {});

// The state a session hands its subscribers once it has loaded the phase.
const entryStates = (aircraft: Aircraft): readonly [string, TrainerState<unknown>][] =>
  Object.keys(aircraft.phases).map((phase) => [
    phase,
    createSession(aircraft, { devices: deviceRegistry, phase }).state(),
  ]);

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
      const problems = declared(aircraft).flatMap(([id, { voice, options }]) => {
        const factory = Object.hasOwn(voiceFactories, voice) ? voiceFactories[voice] : undefined;
        if (!factory) return [`${id}: no voice ${voice}`];
        return factory.problems(options ?? {}).map((problem) => `${id}: ${problem}`);
      });
      expect(problems).toEqual([]);
    },
  );

  it.each(aircraftRegistry.map((aircraft) => [aircraft.id, aircraft] as const))(
    '%s carries only inputs it declares',
    (_id, aircraft) => {
      const unknown = declared(aircraft).flatMap(([id, { inputs, carried }]) =>
        (carried ?? [])
          .filter((name) => !Object.hasOwn(inputs ?? {}, name))
          .map((name) => `${id}: ${name}`),
      );
      expect(unknown).toEqual([]);
    },
  );

  it.each(aircraftRegistry.map((aircraft) => [aircraft.id, aircraft] as const))(
    '%s has selectors that give a finite number on every phase entry state',
    (_id, aircraft) => {
      const failures: string[] = [];
      for (const [id, { inputs }] of declared(aircraft)) {
        for (const [name, select] of Object.entries(inputs ?? {})) {
          for (const [phase, state] of entryStates(aircraft)) {
            try {
              const value = select(state);
              if (!Number.isFinite(value))
                failures.push(`${id}.${name} at ${phase}: gave ${value}`);
            } catch (error) {
              failures.push(`${id}.${name} at ${phase}: threw ${String(error)}`);
            }
          }
        }
      }
      expect(failures).toEqual([]);
    },
  );

  it('declares no sounds for the demo', () => {
    const demo = aircraftRegistry.find((aircraft) => aircraft.id === 'demo');
    expect(demo).toBeDefined();
    expect(Object.keys(demo?.sounds ?? {})).toEqual([]);
  });

  it('uses every panel-kit voice in a registered aircraft', () => {
    const voices = new Set(
      aircraftRegistry.flatMap((aircraft) => declared(aircraft).map(([, { voice }]) => voice)),
    );
    expect(Object.keys(voiceFactories).filter((voice) => !voices.has(voice))).toEqual([]);
  });
});

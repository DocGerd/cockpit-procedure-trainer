import { defineAircraft, everyPhase } from '@cpt/core';
import type { Text, TrainerState } from '@cpt/core';
import { LOW_SUPPLY_V, SUPPLY_INPUT } from './flarm';
import type { FlarmState } from './flarm';

type TestState = { readonly busOn: boolean; readonly volts: number };

const text = (de: string, en: string): Text => ({ de, en });
const environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };
const initial: TestState = { busOn: false, volts: 12 };
const SEED = { powered: true, stage: 'ready', fix: true } as const;

export const flarm = (state: TrainerState<unknown>) => state.devices.flarm?.state as FlarmState;

export const build = (volts: number, seeded: boolean) => {
  const start: TestState = { busOn: true, volts };
  return defineAircraft({
    id: 'flarm-test',
    name: text('Testflugzeug', 'Test aircraft'),
    handbookRevision: text('keine, Testaufbau', 'none, test fixture'),
    controls: {
      bus: {
        kind: 'toggle',
        positions: ['off', 'on'],
        initial: 'off',
        name: text('Bus', 'Bus'),
        description: text('Versorgt das FLARM.', 'Powers the FLARM.'),
      },
      supply: {
        kind: 'toggle',
        positions: ['good', 'low'],
        initial: 'good',
        name: text('Versorgung', 'Supply'),
        description: text(
          'Senkt die Spannung am FLARM unter die Grenze.',
          'Drops the FLARM supply below its limit.',
        ),
      },
    },
    indicators: {},
    views: {
      panel: {
        name: text('Tafel', 'Panel'),
        image: 'panel.svg',
        controls: {
          bus: { rect: { x: 0, y: 50, w: 20, h: 20 } },
          supply: { rect: { x: 30, y: 50, w: 20, h: 20 } },
        },
      },
    },
    devices: {
      flarm: {
        device: 'flarm',
        view: 'panel',
        placement: { rect: { x: 0, y: 0, w: 80, h: 40 } },
        powered: (state: TrainerState<TestState>) => state.systems.busOn,
        inputs: {
          [SUPPLY_INPUT]: (state: TrainerState<TestState>) =>
            state.controls.supply === 'low' ? LOW_SUPPLY_V - 1 : state.systems.volts,
        },
      },
    },
    systems: {
      initial,
      step: (state: TestState, { controls }): TestState => ({
        ...state,
        busOn: controls.bus === 'on',
      }),
    },
    failures: {},
    phases: everyPhase({
      image: 'parking.svg',
      environment,
      entry: {
        controls: { bus: 'on', supply: 'good' },
        state: start,
        ...(seeded ? { deviceStates: { flarm: SEED } } : {}),
      },
    }),
    procedures: {
      quietDown: {
        title: text('Leiser stellen', 'Turn it down'),
        type: 'normal',
        startPhase: 'parking',
        items: [
          {
            type: 'action',
            control: 'flarm.mode',
            position: 'pressed',
            text: text('Mode drücken', 'Press Mode'),
          },
          {
            type: 'check',
            target: { control: 'flarm.mode' },
            condition: (state: TrainerState<unknown>) =>
              flarm(state).volume === 'medium' && flarm(state).operational,
            text: text('Mittel, FLARM bereit', 'Medium, FLARM ready'),
          },
        ],
      },
    },
  });
};

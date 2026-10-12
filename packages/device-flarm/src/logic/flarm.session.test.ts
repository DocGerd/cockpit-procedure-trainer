import {
  createSession,
  defineAircraft,
  everyPhase,
  formatFinding,
  validateAircraft,
  walkProcedure,
} from '@cpt/core';
import type { Text, TrainerState } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { ACQUIRE_MS, LOW_SUPPLY_V, SELF_TEST_MS, SUPPLY_INPUT, flarmDevice } from './flarm';
import type { FlarmState } from './flarm';

type TestState = { readonly busOn: boolean; readonly volts: number };

const text = (de: string, en: string): Text => ({ de, en });
const environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };
const initial: TestState = { busOn: false, volts: 12 };
const SEED = { powered: true, stage: 'ready', fix: true } as const;

const flarm = (state: TrainerState<unknown>) => state.devices.flarm?.state as FlarmState;

const build = (volts: number, seeded: boolean) => {
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
    },
    indicators: {},
    views: {
      panel: {
        name: text('Tafel', 'Panel'),
        image: 'panel.svg',
        controls: { bus: { rect: { x: 0, y: 50, w: 20, h: 20 } } },
      },
    },
    devices: {
      flarm: {
        device: 'flarm',
        view: 'panel',
        placement: { rect: { x: 0, y: 0, w: 80, h: 40 } },
        powered: (state: TrainerState<TestState>) => state.systems.busOn,
        inputs: {
          [SUPPLY_INPUT]: (state: TrainerState<TestState>) => state.systems.volts,
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
        controls: { bus: 'on' },
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

const testAircraft = build(12, true);
const options = { devices: [flarmDevice] };

describe('flarm in an aircraft', () => {
  it('validates without findings', () => {
    expect(validateAircraft(testAircraft, options).map(formatFinding)).toEqual([]);
  });

  it('lets a procedure press Mode and read the state of a seeded unit', () => {
    expect(walkProcedure(testAircraft, 'quietDown', options)).toEqual({ ok: true });
  });

  it('runs the self-test and the search on the session clock after power arrives', () => {
    const session = createSession(build(12, false), options);
    session.advance(50);
    expect(session.state().devices.flarm?.on).toBe(true);
    expect(flarm(session.state())).toMatchObject({ stage: 'selfTest', fix: false });
    session.advance(SELF_TEST_MS);
    expect(flarm(session.state())).toMatchObject({ stage: 'ready', operational: false });
    session.advance(ACQUIRE_MS);
    expect(flarm(session.state())).toMatchObject({ fix: true, operational: true });
  });

  it('goes dark with the bus and starts over when it returns', () => {
    const session = createSession(testAircraft, options);
    session.advance(50);
    expect(flarm(session.state())).toMatchObject({ stage: 'ready', operational: true });
    session.set('bus', 'off');
    session.advance(50);
    expect(session.state().devices.flarm?.on).toBe(false);
    session.set('bus', 'on');
    session.advance(50);
    expect(flarm(session.state())).toMatchObject({ stage: 'selfTest', fix: false });
  });

  it('pulls and pushes back the supply twice, mid self-test and in flight, starting over each time', () => {
    const session = createSession(build(12, false), options);
    session.advance(50);
    session.advance(SELF_TEST_MS / 2);
    session.set('bus', 'off');
    session.advance(50);
    expect(session.state().devices.flarm?.on).toBe(false);
    session.set('bus', 'on');
    session.advance(50);
    expect(flarm(session.state())).toMatchObject({ stage: 'selfTest', fix: false });

    session.advance(SELF_TEST_MS + ACQUIRE_MS);
    session.press('flarm.mode');
    session.advance(2000);
    session.release('flarm.mode');
    expect(flarm(session.state())).toMatchObject({ mode: 'collision', operational: true });

    session.set('bus', 'off');
    session.advance(50);
    session.set('bus', 'on');
    session.advance(50);
    expect(flarm(session.state())).toMatchObject({
      stage: 'selfTest',
      mode: 'nearest',
      volume: 'loud',
      fix: false,
      operational: false,
    });
    session.advance(SELF_TEST_MS + ACQUIRE_MS);
    expect(flarm(session.state()).operational).toBe(true);
  });

  it('swaps the mode when Mode is held for about two seconds', () => {
    const session = createSession(testAircraft, options);
    session.advance(50);
    session.press('flarm.mode');
    session.advance(2000);
    session.release('flarm.mode');
    expect(flarm(session.state())).toMatchObject({ mode: 'collision', volume: 'loud' });
    expect(flarm(session.state()).confirm).not.toBeNull();
  });

  it('is not operational on a low supply', () => {
    const session = createSession(build(LOW_SUPPLY_V - 1, true), options);
    session.advance(50);
    expect(flarm(session.state())).toMatchObject({ lowSupply: true, operational: false });
  });
});

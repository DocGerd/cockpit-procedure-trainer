import {
  createSession,
  defineAircraft,
  formatFinding,
  validateAircraft,
  walkProcedure,
} from '@cpt/core';
import type { Text, TrainerState } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { IDENT_DURATION_MS, PRESSURE_ALTITUDE_INPUT, transponderDevice } from './transponder';
import type { TransponderState } from './transponder';

type TestState = { readonly busOn: boolean; readonly altitudeFt: number };

const text = (de: string, en: string): Text => ({ de, en });
const environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };
const initial: TestState = { busOn: false, altitudeFt: 3400 };

const xpdr = (state: TrainerState<unknown>) => state.devices.xpdr?.state as TransponderState;

const testAircraft = defineAircraft({
  id: 'transponder-test',
  name: text('Testflugzeug', 'Test aircraft'),
  handbookRevision: text('keine, Testaufbau', 'none, test fixture'),
  controls: {
    bus: {
      kind: 'toggle',
      positions: ['off', 'on'],
      initial: 'off',
      name: text('Bus', 'Bus'),
      description: text('Versorgt den Transponder.', 'Powers the transponder.'),
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
    xpdr: {
      device: 'transponder',
      view: 'panel',
      placement: { rect: { x: 0, y: 0, w: 80, h: 40 } },
      powered: (state: TrainerState<TestState>) => state.systems.busOn,
      inputs: {
        [PRESSURE_ALTITUDE_INPUT]: (state: TrainerState<TestState>) => state.systems.altitudeFt,
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
  phases: {
    parking: {
      name: text('Parken', 'Parking'),
      image: 'parking.svg',
      environment,
      entry: { controls: { bus: 'off' }, state: initial },
    },
  },
  procedures: {
    setCode: {
      title: text('Code einstellen', 'Set the code'),
      type: 'normal',
      startPhase: 'parking',
      items: [
        { type: 'action', control: 'bus', position: 'on', text: text('Bus ein', 'Bus on') },
        {
          type: 'action',
          control: 'xpdr.code1',
          position: '1',
          text: text('Ziffer 1 auf 1', 'Digit 1 to 1'),
        },
        {
          type: 'action',
          control: 'xpdr.code2',
          position: '2',
          text: text('Ziffer 2 auf 2', 'Digit 2 to 2'),
        },
        {
          type: 'action',
          control: 'xpdr.mode',
          position: 'alt',
          text: text('Betriebsart Höhe', 'Mode altitude'),
        },
        {
          type: 'action',
          control: 'xpdr.ident',
          position: 'pressed',
          text: text('Ident drücken', 'Press ident'),
        },
        {
          type: 'check',
          target: { control: 'xpdr.mode' },
          condition: (state: TrainerState<unknown>) =>
            xpdr(state).squawk === '1200' && xpdr(state).altitude === 3400,
          text: text('1200, Höhe', '1200, altitude'),
        },
      ],
    },
  },
});

describe('transponder in an aircraft', () => {
  it('validates without findings', () => {
    const findings = validateAircraft(testAircraft, { devices: [transponderDevice] });
    expect(findings.map(formatFinding)).toEqual([]);
  });

  it('lets a procedure set the code and mode and read the state', () => {
    expect(walkProcedure(testAircraft, 'setCode', { devices: [transponderDevice] })).toEqual({
      ok: true,
    });
  });

  it('follows the bus and the install input', () => {
    const session = createSession(testAircraft, { devices: [transponderDevice] });
    session.set('xpdr.mode', 'alt');
    expect(session.state().devices.xpdr?.on).toBe(false);
    expect(xpdr(session.state()).altitude).toBeNull();

    session.set('bus', 'on');
    session.advance(50);
    expect(session.state().devices.xpdr?.on).toBe(true);
    expect(xpdr(session.state())).toMatchObject({ mode: 'alt', altitude: 3400 });
  });

  it('runs the ident reply down on the session clock', () => {
    const session = createSession(testAircraft, { devices: [transponderDevice] });
    session.set('bus', 'on');
    session.set('xpdr.mode', 'on');
    session.advance(50);
    session.press('xpdr.ident');
    session.release('xpdr.ident');
    expect(xpdr(session.state()).ident).toBe(true);
    for (let elapsed = 0; elapsed < IDENT_DURATION_MS; elapsed += 50) session.advance(50);
    expect(xpdr(session.state()).ident).toBe(false);
  });
});

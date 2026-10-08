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
import { IDENT_DURATION_MS, PRESSURE_ALTITUDE_INPUT, gtx327Device } from './gtx327';
import type { Gtx327State } from './gtx327';

type TestState = { readonly busOn: boolean; readonly altitudeFt: number };

const text = (de: string, en: string): Text => ({ de, en });
const environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };
const initial: TestState = { busOn: false, altitudeFt: 3400 };

const xpdr = (state: TrainerState<unknown>) => state.devices.xpdr?.state as Gtx327State;

const action = (control: `${string}.${string}`, position: string, label: string) =>
  ({ type: 'action', control, position, text: text(label, label) }) as const;

const testAircraft = defineAircraft({
  id: 'gtx327-test',
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
      device: 'gtx327',
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
  phases: everyPhase({
    image: 'parking.svg',
    environment,
    entry: { controls: { bus: 'off' }, state: initial },
  }),
  procedures: {
    setCode: {
      title: text('Code einstellen', 'Set the code'),
      type: 'normal',
      startPhase: 'parking',
      items: [
        { type: 'action', control: 'bus', position: 'on', text: text('Bus ein', 'Bus on') },
        action('xpdr.mode', 'sby', 'Standby'),
        action('xpdr.key1', 'pressed', 'Digit 1'),
        action('xpdr.key2', 'pressed', 'Digit 2'),
        action('xpdr.key3', 'pressed', 'Digit 3'),
        action('xpdr.key4', 'pressed', 'Digit 4'),
        action('xpdr.mode', 'alt', 'Altitude'),
        {
          type: 'check',
          target: { control: 'xpdr.mode' },
          condition: (state: TrainerState<unknown>) =>
            xpdr(state).squawk === '1234' && xpdr(state).altitude === 3400,
          text: text('1234, Höhe', '1234, altitude'),
        },
      ],
    },
  },
});

const options = { devices: [gtx327Device] };

describe('gtx327 in an aircraft', () => {
  it('validates without findings', () => {
    expect(validateAircraft(testAircraft, options).map(formatFinding)).toEqual([]);
  });

  it('lets a procedure type the code, set the mode and read the state', () => {
    expect(walkProcedure(testAircraft, 'setCode', options)).toEqual({ ok: true });
  });

  it('follows the bus and the install input', () => {
    const session = createSession(testAircraft, options);
    session.set('xpdr.mode', 'alt');
    expect(session.state().devices.xpdr?.on).toBe(false);
    expect(xpdr(session.state()).altitude).toBeNull();

    session.set('bus', 'on');
    session.advance(50);
    expect(session.state().devices.xpdr?.on).toBe(true);
    expect(xpdr(session.state())).toMatchObject({ mode: 'alt', altitude: 3400 });
  });

  it('counts one digit per press and release', () => {
    const session = createSession(testAircraft, options);
    session.set('bus', 'on');
    session.set('xpdr.mode', 'sby');
    session.advance(50);
    for (const key of ['xpdr.key5', 'xpdr.key5']) {
      session.press(key);
      session.advance(50);
      session.release(key);
    }
    expect(xpdr(session.state()).entry).toBe('55');
  });

  it('runs the ident reply down on the session clock', () => {
    const session = createSession(testAircraft, options);
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

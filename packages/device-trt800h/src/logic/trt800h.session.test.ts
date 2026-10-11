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
import { POWER_OFF_HOLD_MS, PRESSURE_ALTITUDE_INPUT, trt800hDevice } from './trt800h';
import type { Trt800hState } from './trt800h';

type TestState = { readonly busOn: boolean; readonly altitudeFt: number };

const text = (de: string, en: string): Text => ({ de, en });
const environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };
const initial: TestState = { busOn: false, altitudeFt: 3400 };

const xpdr = (state: TrainerState<unknown>) => state.devices.xpdr?.state as Trt800hState;

const action = (control: `${string}.${string}`, position: string, label: string) =>
  ({ type: 'action', control, position, text: text(label, label) }) as const;

const testAircraft = defineAircraft({
  id: 'trt800h-test',
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
      device: 'trt800h',
      view: 'panel',
      placement: { rect: { x: 0, y: 0, w: 40, h: 40 } },
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
    lineUp: {
      title: text('Aufrollen', 'Line up'),
      type: 'normal',
      startPhase: 'parking',
      items: [
        { type: 'action', control: 'bus', position: 'on', text: text('Bus ein', 'Bus on') },
        action('xpdr.power', 'pressed', 'Switch on'),
        {
          type: 'check',
          target: { control: 'xpdr.power' },
          condition: (state: TrainerState<unknown>) =>
            xpdr(state).on && xpdr(state).mode === 'stby',
          text: text('Ein, Standby', 'On, standby'),
        },
        action('xpdr.vfr', 'pressed', 'VFR'),
        action('xpdr.mode', 'pressed', 'Mode'),
        {
          type: 'check',
          target: { control: 'xpdr.mode' },
          condition: (state: TrainerState<unknown>) =>
            xpdr(state).squawk === '7000' &&
            xpdr(state).mode === 'acs' &&
            xpdr(state).flightLevel === 34,
          text: text('7000, ACS, FL 034', '7000, ACS, FL 034'),
        },
      ],
    },
  },
});

const options = { devices: [trt800hDevice] };

const tap = (session: ReturnType<typeof createSession>, control: string, position?: string) => {
  session.press(control, position);
  session.advance(50);
  session.release(control);
  session.advance(50);
};

describe('trt800h in an aircraft', () => {
  it('validates without findings', () => {
    expect(validateAircraft(testAircraft, options).map(formatFinding)).toEqual([]);
  });

  it('lets a procedure switch on, activate VFR and select ACS', () => {
    expect(walkProcedure(testAircraft, 'lineUp', options)).toEqual({ ok: true });
  });

  it('is off until the bus is on and I/O is pressed, then follows the install input', () => {
    const session = createSession(testAircraft, options);
    tap(session, 'xpdr.power');
    expect(session.state().devices.xpdr?.on).toBe(false);

    session.set('bus', 'on');
    session.advance(50);
    expect(session.state().devices.xpdr?.on).toBe(true);
    expect(xpdr(session.state()).on).toBe(false);

    tap(session, 'xpdr.power');
    expect(xpdr(session.state())).toMatchObject({ on: true, flightLevel: 34 });
  });

  it('enters a standby code with the cursor and the knob', () => {
    const session = createSession(testAircraft, options);
    session.set('bus', 'on');
    tap(session, 'xpdr.power');
    for (const digit of [1, 2, 3, 4]) {
      tap(session, 'xpdr.cursor');
      const target = String(digit);
      const current = xpdr(session.state()).standby[digit - 1];
      for (let turns = 0; turns < (Number(target) - Number(current) + 8) % 8; turns++) {
        tap(session, 'xpdr.knob', 'up');
      }
    }
    tap(session, 'xpdr.cursor');
    tap(session, 'xpdr.swap');
    expect(xpdr(session.state())).toMatchObject({ squawk: '1234', standby: '2000' });
  });

  it('switches off after the hold on the session clock', () => {
    const session = createSession(testAircraft, options);
    session.set('bus', 'on');
    tap(session, 'xpdr.power');
    session.press('xpdr.power');
    for (let elapsed = 0; elapsed < POWER_OFF_HOLD_MS; elapsed += 50) {
      expect(xpdr(session.state()).on).toBe(true);
      session.advance(50);
    }
    expect(xpdr(session.state()).on).toBe(false);
    session.release('xpdr.power');
  });

  it('loses the display with the bus and keeps the codes', () => {
    const session = createSession(testAircraft, options);
    session.set('bus', 'on');
    tap(session, 'xpdr.power');
    tap(session, 'xpdr.vfr');
    session.set('bus', 'off');
    session.advance(50);
    expect(xpdr(session.state())).toMatchObject({ on: false, squawk: '7000', standby: '2000' });
  });
  it('pulls and pushes back the supply: dark, then off until I/O, with the codes kept', () => {
    const session = createSession(testAircraft, options);
    session.set('bus', 'on');
    tap(session, 'xpdr.power');
    tap(session, 'xpdr.vfr');
    tap(session, 'xpdr.mode');
    expect(xpdr(session.state())).toMatchObject({ on: true, mode: 'acs', squawk: '7000' });

    session.set('bus', 'off');
    session.advance(50);
    tap(session, 'xpdr.mode');
    expect(xpdr(session.state())).toMatchObject({ on: false, mode: 'stby', reporting: false });

    session.set('bus', 'on');
    session.advance(50);
    expect(xpdr(session.state())).toMatchObject({ on: false, squawk: '7000', standby: '2000' });
    tap(session, 'xpdr.mode');
    expect(xpdr(session.state()).on).toBe(false);

    tap(session, 'xpdr.power');
    expect(xpdr(session.state())).toMatchObject({
      on: true,
      mode: 'stby',
      squawk: '7000',
      flightLevel: 34,
    });
    tap(session, 'xpdr.mode');
    expect(xpdr(session.state())).toMatchObject({ mode: 'acs', reporting: true });
  });

  it('survives a pull while the switch-off hold is running', () => {
    const session = createSession(testAircraft, options);
    session.set('bus', 'on');
    tap(session, 'xpdr.power');
    session.press('xpdr.power');
    session.advance(POWER_OFF_HOLD_MS - 500);
    session.set('bus', 'off');
    session.advance(100);
    session.set('bus', 'on');
    session.advance(POWER_OFF_HOLD_MS);
    session.release('xpdr.power');
    session.advance(50);
    expect(xpdr(session.state()).on).toBe(false);
    tap(session, 'xpdr.power');
    expect(xpdr(session.state()).on).toBe(true);
  });
});

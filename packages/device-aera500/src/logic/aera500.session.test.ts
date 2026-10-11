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
import { ACQUIRE_MS, POWER_OFF_HOLD_MS, aera500Device } from './aera500';
import type { Aera500State } from './aera500';

type TestState = { readonly busOn: boolean };

const text = (de: string, en: string): Text => ({ de, en });
const environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };
const initial: TestState = { busOn: false };

const gps = (state: TrainerState<unknown>) => state.devices.gps?.state as Aera500State;

const action = (control: `${string}.${string}`, position: string, label: string) =>
  ({ type: 'action', control, position, text: text(label, label) }) as const;

const testAircraft = defineAircraft({
  id: 'aera500-test',
  name: text('Testflugzeug', 'Test aircraft'),
  handbookRevision: text('keine, Testaufbau', 'none, test fixture'),
  controls: {
    bus: {
      kind: 'toggle',
      positions: ['off', 'on'],
      initial: 'off',
      name: text('Bus', 'Bus'),
      description: text('Versorgt das GPS.', 'Powers the GPS.'),
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
    gps: {
      device: 'aera500',
      view: 'panel',
      placement: { rect: { x: 0, y: 0, w: 80, h: 40 } },
      powered: (state: TrainerState<TestState>) => state.systems.busOn,
      inputs: {
        groundSpeedKt: () => 62,
        trackDeg: () => 180,
        altitudeFt: () => 2500,
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
    startUp: {
      title: text('GPS starten', 'Start the GPS'),
      type: 'normal',
      startPhase: 'parking',
      items: [
        { type: 'action', control: 'bus', position: 'on', text: text('Bus ein', 'Bus on') },
        {
          type: 'check',
          target: { control: 'gps.touch' },
          condition: (state: TrainerState<unknown>) =>
            gps(state).on && gps(state).page === 'startup',
          text: text('GPS zeigt die Startseite', 'GPS shows the start-up page'),
        },
        action('gps.touch', 'accept', 'Accept the databases'),
        action('gps.touch', 'map', 'Open the map'),
        {
          type: 'check',
          target: { control: 'gps.touch' },
          condition: (state: TrainerState<unknown>) => gps(state).page === 'map',
          text: text('Kartenseite', 'Map page'),
        },
      ],
    },
  },
});

const options = { devices: [aera500Device] };

describe('aera500 in an aircraft', () => {
  it('validates without findings', () => {
    expect(validateAircraft(testAircraft, options).map(formatFinding)).toEqual([]);
  });

  it('lets a procedure switch it on and change the page', () => {
    expect(walkProcedure(testAircraft, 'startUp', options)).toEqual({ ok: true });
  });

  it('follows the bus and switches on at the start-up page', () => {
    const session = createSession(testAircraft, options);
    session.advance(50);
    expect(gps(session.state())).toMatchObject({ on: false, powered: false });

    session.set('bus', 'on');
    session.advance(50);
    expect(gps(session.state())).toMatchObject({ on: true, powered: true, page: 'startup' });

    session.set('bus', 'off');
    session.advance(50);
    expect(gps(session.state())).toMatchObject({ on: false, powered: false, page: 'startup' });
  });

  it('finds its fix after the search time and reads the aircraft inputs', () => {
    const session = createSession(testAircraft, options);
    session.set('bus', 'on');
    session.advance(ACQUIRE_MS + 50);
    expect(gps(session.state())).toMatchObject({
      fix: true,
      groundSpeedKt: 62,
      trackDeg: 180,
      altitudeFt: 2500,
    });
  });

  it('counts one touch per press and release', () => {
    const session = createSession(testAircraft, options);
    session.set('bus', 'on');
    session.advance(50);
    session.press('gps.touch', 'accept');
    session.advance(50);
    session.release('gps.touch');
    session.advance(50);
    expect(gps(session.state()).page).toBe('home');
  });

  it('switches off after a hold of POWER and not after a short press', () => {
    const session = createSession(testAircraft, options);
    session.set('bus', 'on');
    session.advance(50);
    session.press('gps.power');
    session.advance(POWER_OFF_HOLD_MS - 100);
    expect(gps(session.state()).on).toBe(true);
    session.advance(200);
    expect(gps(session.state()).on).toBe(false);
  });
  it('pulls and pushes back the supply: start-up page again, fix lost and searched anew', () => {
    const session = createSession(testAircraft, options);
    session.set('bus', 'on');
    session.advance(50);
    session.press('gps.touch', 'accept');
    session.advance(50);
    session.release('gps.touch');
    session.advance(ACQUIRE_MS);
    expect(gps(session.state())).toMatchObject({ page: 'home', fix: true });

    session.set('bus', 'off');
    session.advance(50);
    expect(gps(session.state())).toMatchObject({ on: false, fix: false, groundSpeedKt: null });

    session.set('bus', 'on');
    session.advance(50);
    expect(gps(session.state())).toMatchObject({ on: true, page: 'startup', fix: false });
    session.advance(ACQUIRE_MS - 500);
    expect(gps(session.state()).fix).toBe(false);
    session.advance(1000);
    expect(gps(session.state()).fix).toBe(true);
  });

  it('accepts the databases after a pull during the start-up page', () => {
    const session = createSession(testAircraft, options);
    session.set('bus', 'on');
    session.advance(500);
    expect(gps(session.state())).toMatchObject({ on: true, page: 'startup' });
    session.set('bus', 'off');
    session.advance(50);
    expect(gps(session.state()).on).toBe(false);
    session.set('bus', 'on');
    session.advance(50);
    expect(gps(session.state())).toMatchObject({ on: true, page: 'startup' });
    session.press('gps.touch', 'accept');
    session.advance(50);
    session.release('gps.touch');
    session.advance(50);
    expect(gps(session.state()).page).toBe('home');
  });
});

import {
  createSession,
  defineAircraft,
  formatFinding,
  validateAircraft,
  walkProcedure,
} from '@cpt/core';
import type { Text, TrainerState } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { gpsmap496Device } from './gpsmap496';
import type { Gpsmap496State } from './gpsmap496';

type TestState = { readonly busOn: boolean };

const text = (de: string, en: string): Text => ({ de, en });
const environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };
const initial: TestState = { busOn: false };

const gps = (state: TrainerState<unknown>) => state.devices.gps?.state as Gpsmap496State;

const action = (control: `${string}.${string}`, position: string, label: string) =>
  ({ type: 'action', control, position, text: text(label, label) }) as const;

const testAircraft = defineAircraft({
  id: 'gpsmap496-test',
  name: text('Testflugzeug', 'Test aircraft'),
  handbookRevision: 'none, test fixture',
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
      device: 'gpsmap496',
      view: 'panel',
      placement: { rect: { x: 0, y: 0, w: 80, h: 40 } },
      powered: (state: TrainerState<TestState>) => state.systems.busOn,
      inputs: {},
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
    startUp: {
      title: text('GPS starten', 'Start the GPS'),
      type: 'normal',
      startPhase: 'parking',
      items: [
        { type: 'action', control: 'bus', position: 'on', text: text('Bus ein', 'Bus on') },
        action('gps.power', 'pressed', 'GPS on'),
        action('gps.page', 'pressed', 'Next page'),
        {
          type: 'check',
          target: { control: 'gps.power' },
          condition: (state: TrainerState<unknown>) =>
            gps(state).on && gps(state).page === 'terrain',
          text: text('GPS an, zweite Seite', 'GPS on, second page'),
        },
      ],
    },
  },
});

const options = { devices: [gpsmap496Device] };

describe('gpsmap496 in an aircraft', () => {
  it('validates without findings', () => {
    expect(validateAircraft(testAircraft, options).map(formatFinding)).toEqual([]);
  });

  it('lets a procedure switch it on and change the page', () => {
    expect(walkProcedure(testAircraft, 'startUp', options)).toEqual({ ok: true });
  });

  it('follows the bus', () => {
    const session = createSession(testAircraft, options);
    session.advance(50);
    expect(session.state().devices.gps?.on).toBe(false);

    session.set('bus', 'on');
    session.advance(50);
    expect(session.state().devices.gps?.on).toBe(true);
    session.press('gps.power');
    session.advance(50);
    session.release('gps.power');
    session.advance(50);
    expect(gps(session.state()).on).toBe(true);

    session.set('bus', 'off');
    session.advance(50);
    expect(session.state().devices.gps?.on).toBe(false);
    expect(gps(session.state())).toMatchObject({ on: false, page: 'map' });
  });
});

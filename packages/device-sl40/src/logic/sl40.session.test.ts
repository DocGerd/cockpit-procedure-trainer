import {
  createSession,
  defineAircraft,
  formatFinding,
  validateAircraft,
  walkProcedure,
} from '@cpt/core';
import type { Text, TrainerState } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { sl40Device } from './sl40';
import type { Sl40State } from './sl40';

type BusState = { readonly busOn: boolean };

const text = (de: string, en: string): Text => ({ de, en });
const environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };
const initial: BusState = { busOn: false };

const comState = (state: TrainerState<unknown>) => state.devices.radio?.state as Sl40State;

const testAircraft = defineAircraft({
  id: 'sl40-test',
  name: text('Testflugzeug', 'Test aircraft'),
  handbookRevision: 'none, test fixture',
  controls: {
    bus: {
      kind: 'toggle',
      positions: ['off', 'on'],
      initial: 'off',
      name: text('Bus', 'Bus'),
      description: text('Versorgt das Funkgerät.', 'Powers the radio.'),
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
    radio: {
      device: 'sl40',
      view: 'panel',
      placement: { rect: { x: 0, y: 0, w: 80, h: 40 } },
      powered: (state: TrainerState<BusState>) => state.systems.busOn,
      inputs: {},
    },
  },
  systems: {
    initial,
    step: (_state: BusState, { controls }): BusState => ({ busOn: controls.bus === 'on' }),
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
    tune: {
      title: text('Abstimmen', 'Tune'),
      type: 'normal',
      startPhase: 'parking',
      items: [
        { type: 'action', control: 'bus', position: 'on', text: text('Bus ein', 'Bus on') },
        {
          type: 'action',
          control: 'radio.coarse',
          position: 'up',
          text: text('Grob rauf', 'Coarse up'),
        },
        {
          type: 'action',
          control: 'radio.swap',
          position: 'pressed',
          text: text('Tauschen', 'Swap'),
        },
        {
          type: 'check',
          target: { control: 'radio.swap' },
          condition: (state: TrainerState<unknown>) => comState(state).active === 120000,
          text: text('Aktiv 120,000', 'Active 120.000'),
        },
      ],
    },
  },
});

describe('com in an aircraft', () => {
  it('validates without findings', () => {
    const findings = validateAircraft(testAircraft, { devices: [sl40Device] });
    expect(findings.map(formatFinding)).toEqual([]);
  });

  it('lets a procedure drive its controls and read its state', () => {
    expect(walkProcedure(testAircraft, 'tune', { devices: [sl40Device] })).toEqual({ ok: true });
  });

  it('follows the bus', () => {
    const session = createSession(testAircraft, { devices: [sl40Device] });
    session.press('radio.swap');
    session.release('radio.swap');
    expect(session.state().devices.radio?.on).toBe(false);
    expect(comState(session.state())).toMatchObject({ active: 118000, standby: 119000 });

    session.set('bus', 'on');
    session.advance(50);
    expect(session.state().devices.radio?.on).toBe(true);
    session.press('radio.swap');
    session.release('radio.swap');
    expect(comState(session.state())).toMatchObject({ active: 119000, standby: 118000 });
  });

  it('counts one click per press and release', () => {
    const session = createSession(testAircraft, { devices: [sl40Device] });
    session.set('bus', 'on');
    session.advance(50);
    for (let clicks = 0; clicks < 3; clicks++) {
      session.press('radio.fine', 'up');
      session.advance(50);
      session.release('radio.fine');
    }
    expect(comState(session.state()).standby).toBe(119075);
  });
});

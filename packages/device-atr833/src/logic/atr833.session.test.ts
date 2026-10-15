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
import { LONG_PRESS_MS, POWER_OFF_HOLD_MS, atr833Device } from './atr833';
import type { Atr833State } from './atr833';

type BusState = { readonly busOn: boolean };

const text = (de: string, en: string): Text => ({ de, en });
const environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };
const initial: BusState = { busOn: false };
const SLICE_MS = 100;

const radio = (state: TrainerState<unknown>) => state.devices.radio?.state as Atr833State;

const testAircraft = defineAircraft({
  id: 'atr833-test',
  name: text('Testflugzeug', 'Test aircraft'),
  handbookRevision: text('keine, Testaufbau', 'none, test fixture'),
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
      device: 'atr833',
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
  phases: everyPhase({
    image: 'parking.svg',
    environment,
    entry: { controls: { bus: 'off' }, state: initial },
  }),
  procedures: {
    tune: {
      title: text('Abstimmen', 'Tune'),
      type: 'normal',
      startPhase: 'parking',
      items: [
        { type: 'action', control: 'bus', position: 'on', text: text('Bus ein', 'Bus on') },
        {
          type: 'action',
          control: 'radio.power',
          position: 'pressed',
          text: text('Funkgerät ein', 'Radio on'),
        },
        {
          type: 'action',
          control: 'radio.freq',
          position: 'up',
          text: text('Frequenz rauf', 'Frequency up'),
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
          condition: (state: TrainerState<unknown>) => radio(state).active === 120000,
          text: text('Aktiv 120,000', 'Active 120.000'),
        },
      ],
    },
  },
});

const options = { devices: [atr833Device] };

const busOnAndSwitchOn = (session: ReturnType<typeof createSession>) => {
  session.set('bus', 'on');
  session.advance(SLICE_MS);
  session.press('radio.power');
  session.advance(SLICE_MS);
  session.release('radio.power');
  session.advance(SLICE_MS);
};

const holdFor = (session: ReturnType<typeof createSession>, control: string, ms: number) => {
  session.press(control);
  for (let elapsed = 0; elapsed < ms; elapsed += SLICE_MS) session.advance(SLICE_MS);
};

describe('atr833 in an aircraft', () => {
  it('validates without findings', () => {
    expect(validateAircraft(testAircraft, options).map(formatFinding)).toEqual([]);
  });

  it('lets a procedure tune the standby frequency, swap and read the state', () => {
    expect(walkProcedure(testAircraft, 'tune', options)).toEqual({ ok: true });
  });

  it('is switched on by I/O after the bus arrives and keeps its frequencies when the bus drops', () => {
    const session = createSession(testAircraft, options);
    expect(radio(session.state()).on).toBe(false);

    session.set('bus', 'on');
    session.advance(SLICE_MS);
    expect(radio(session.state())).toMatchObject({ on: false, powered: true });
    session.press('radio.power');
    session.advance(SLICE_MS);
    session.release('radio.power');
    session.advance(SLICE_MS);
    expect(radio(session.state()).on).toBe(true);
    session.press('radio.freq', 'up');
    session.release('radio.freq');
    session.set('bus', 'off');
    session.advance(SLICE_MS);
    expect(radio(session.state())).toMatchObject({ on: false, standby: 120000 });
    session.set('bus', 'on');
    session.advance(SLICE_MS);
    expect(radio(session.state())).toMatchObject({ on: false, standby: 120000 });
  });

  it('counts one click per press and release', () => {
    const session = createSession(testAircraft, options);
    busOnAndSwitchOn(session);
    for (let clicks = 0; clicks < 3; clicks++) {
      session.press('radio.freq', 'up');
      session.advance(SLICE_MS);
      session.release('radio.freq');
    }
    expect(radio(session.state()).standby).toBe(122000);
  });

  it('switches off after the power key is held, on the session clock', () => {
    const session = createSession(testAircraft, options);
    busOnAndSwitchOn(session);
    holdFor(session, 'radio.power', POWER_OFF_HOLD_MS - SLICE_MS * 2);
    expect(radio(session.state()).on).toBe(true);
    holdFor(session, 'radio.power', SLICE_MS * 3);
    expect(radio(session.state()).on).toBe(false);
    session.release('radio.power');
    session.press('radio.power');
    session.release('radio.power');
    expect(radio(session.state()).on).toBe(true);
  });

  it('stores the active frequency into the memory entry after MEM is held in the memory list', () => {
    const session = createSession(testAircraft, options);
    busOnAndSwitchOn(session);
    session.press('radio.mem');
    session.release('radio.mem');
    expect(radio(session.state()).list).toEqual({ kind: 'mem', index: 0 });
    holdFor(session, 'radio.mem', LONG_PRESS_MS + SLICE_MS);
    session.release('radio.mem');
    expect(radio(session.state()).memory[0]).toBe(118000);
    expect(radio(session.state())).toMatchObject({
      standby: 119000,
      list: { kind: 'mem', index: 0 },
    });
  });
});

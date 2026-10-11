import { createSession } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { ctslAircraft } from './index';
import { devices } from './devices';
import { KMH_PER_KT, initial } from './systems';
import type { CtslTrainerState } from './systems';
import { testDevices } from './test-devices';
import { deviceSlots } from './views';

const stateWith = (
  avionicsPowered: boolean,
  breakers: Record<string, string>,
  altitudeFt = 0,
  volts = 12.5,
): CtslTrainerState => ({
  controls: breakers,
  guards: {},
  systems: { ...initial, altitudeFt, bus: { ...initial.bus, avionicsPowered, volts } },
  devices: {},
});

const standInControls = (id: string) =>
  Object.keys(testDevices.find((device) => device.id === id)?.controls ?? {});

describe('the ATR833 install', () => {
  const install = devices.com;

  it('installs the atr833 device on the panel in the COM slot', () => {
    expect(install).toMatchObject({ device: 'atr833', view: 'panel', placement: deviceSlots.com });
    expect(install.inputs).toEqual({});
  });

  it.each([
    [true, 'in', true],
    [false, 'in', false],
    [true, 'pulled', false],
    [false, 'pulled', false],
  ])('with the avionics bus %s and the breaker %s, powered is %s', (bus, breaker, expected) => {
    expect(install.powered(stateWith(bus, { comBreaker: breaker }))).toBe(expected);
  });

  it('has a stand-in with the control ids of the device', () => {
    expect(standInControls('atr833')).toEqual([
      'power',
      'set',
      'mem',
      'dw',
      'swap',
      'cursor',
      'volSel',
      'freq',
    ]);
  });
});

describe('the TRT800H install', () => {
  const install = devices.xpdr;

  it('installs the trt800h device in the transponder slot of the panel', () => {
    expect(install).toMatchObject({
      device: 'trt800h',
      view: 'panel',
      placement: deviceSlots.xpdr,
    });
  });

  it.each([
    [true, 'in', true],
    [false, 'in', false],
    [true, 'pulled', false],
    [false, 'pulled', false],
  ])('with the avionics bus %s and the breaker %s, powered is %s', (bus, breaker, expected) => {
    expect(install.powered(stateWith(bus, { xpdrBreaker: breaker }))).toBe(expected);
  });

  it('ignores the COM breaker', () => {
    expect(install.powered(stateWith(true, { xpdrBreaker: 'in', comBreaker: 'pulled' }))).toBe(
      true,
    );
  });

  it('feeds the pressure altitude from the altitude of the aircraft', () => {
    expect(install.inputs.pressureAltitude(stateWith(true, {}, 4200))).toBe(4200);
  });

  it('has a stand-in with the control ids of the device', () => {
    expect(standInControls('trt800h')).toEqual([
      'power',
      'vfr',
      'ident',
      'mode',
      'swap',
      'cursor',
      'knob',
    ]);
  });
});

describe('the aera 500 install', () => {
  const install = devices.gps;

  it('installs the aera500 device in the GPS slot of the panel', () => {
    expect(install).toMatchObject({
      device: 'aera500',
      view: 'panel',
      placement: deviceSlots.gps,
    });
    expect(Object.keys(install.inputs)).toEqual(['groundSpeedKt', 'trackDeg', 'altitudeFt']);
  });

  it('reads the airspeed as ground speed in knots, the heading as track and the altitude', () => {
    const state = stateWith(true, {}, 2500);
    const flying = {
      ...state,
      systems: { ...state.systems, airspeedKmh: 108 * KMH_PER_KT, headingDeg: 180 },
    };
    expect(install.inputs.groundSpeedKt(flying)).toBeCloseTo(108);
    expect(install.inputs.trackDeg(flying)).toBe(180);
    expect(install.inputs.altitudeFt(flying)).toBe(2500);
  });

  it.each([
    [true, 'in', true],
    [false, 'in', false],
    [true, 'pulled', false],
    [false, 'pulled', false],
  ])('with the avionics bus %s and the breaker %s, powered is %s', (bus, breaker, expected) => {
    expect(install.powered(stateWith(bus, { gpsBreaker: breaker }))).toBe(expected);
  });

  it('ignores the COM breaker', () => {
    expect(install.powered(stateWith(true, { gpsBreaker: 'in', comBreaker: 'pulled' }))).toBe(true);
  });

  it('has a stand-in with the control ids of the device and every touch icon', () => {
    expect(standInControls('aera500')).toEqual(['power', 'touch']);
    const touch = testDevices.find((device) => device.id === 'aera500')?.controls.touch;
    expect(touch).toMatchObject({ kind: 'rotary', initial: 'rest' });
    expect(touch?.positions).toEqual(
      expect.arrayContaining(['rest', 'accept', 'home', 'map', 'zoomIn', 'zoomOut', 'gpsStatus']),
    );
  });
});

describe('the FLARM install', () => {
  const install = devices.flarm;

  it('installs the flarm device in the FLARM slot of the panel', () => {
    expect(install).toMatchObject({
      device: 'flarm',
      view: 'panel',
      placement: deviceSlots.flarm,
    });
    expect(Object.keys(install.inputs)).toEqual(['supplyVolts']);
  });

  it.each([
    [true, true],
    [false, false],
  ])('runs on the avionics bus with no breaker of its own: bus %s, powered %s', (bus, expected) => {
    for (const breaker of ['in', 'pulled']) {
      const breakers = { comBreaker: breaker, xpdrBreaker: breaker, gpsBreaker: breaker };
      expect(install.powered(stateWith(bus, breakers))).toBe(expected);
    }
  });

  it('feeds the supply voltage from the bus', () => {
    expect(install.inputs.supplyVolts(stateWith(true, {}, 0, 13.8))).toBe(13.8);
  });

  it('has a stand-in with the control ids of the device', () => {
    expect(standInControls('flarm')).toEqual(['mode']);
  });
});

describe('the avionics master', () => {
  it('turns the radio, the transponder, the GPS and the FLARM off together, and on again', () => {
    const session = createSession(ctslAircraft, { devices: testDevices, phase: 'holding' });
    session.advance(100);
    const powered = () => [
      session.state().devices.com?.on,
      session.state().devices.xpdr?.on,
      session.state().devices.gps?.on,
      session.state().devices.flarm?.on,
    ];
    expect(powered()).toEqual([true, true, true, true]);

    session.set('avionicsMaster', 'off');
    session.advance(100);
    expect(powered()).toEqual([false, false, false, false]);

    session.set('avionicsMaster', 'on');
    session.advance(100);
    expect(powered()).toEqual([true, true, true, true]);
  });
});

describe('pulling and pushing back power on the CTSL', () => {
  const holding = () => {
    const session = createSession(ctslAircraft, { devices: testDevices, phase: 'holding' });
    session.advance(100);
    const powered = () =>
      ['com', 'xpdr', 'gps', 'flarm'].map((id) => session.state().devices[id]?.on);
    return { session, powered };
  };
  const cycle = (
    { session, powered }: ReturnType<typeof holding>,
    control: string,
    out: string,
    pulled: boolean[],
  ) => {
    session.set(control, out);
    session.advance(100);
    expect(powered()).toEqual(pulled);
    session.set(control, control === 'avionicsMaster' ? 'on' : 'in');
    session.advance(100);
    expect(powered()).toEqual([true, true, true, true]);
  };

  it('each unit breaker takes only its own unit down and back', () => {
    const world = holding();
    expect(world.powered()).toEqual([true, true, true, true]);
    cycle(world, 'comBreaker', 'pulled', [false, true, true, true]);
    cycle(world, 'xpdrBreaker', 'pulled', [true, false, true, true]);
    cycle(world, 'gpsBreaker', 'pulled', [true, true, false, true]);
  });

  it('the avionics master takes all four down, the FLARM included, and back', () => {
    cycle(holding(), 'avionicsMaster', 'off', [false, false, false, false]);
  });

  it('the battery off and on again, with the generator off, takes all four down and back', () => {
    const world = holding();
    world.session.set('generator', 'pulled');
    world.session.advance(100);
    expect(world.powered()).toEqual([true, true, true, true]);
    cycle(world, 'battery', 'pulled', [false, false, false, false]);
  });

  it('a breaker pulled while the master is off stays dark when the master comes on', () => {
    const { session, powered } = holding();
    session.set('xpdrBreaker', 'pulled');
    session.set('avionicsMaster', 'off');
    session.advance(100);
    session.set('avionicsMaster', 'on');
    session.advance(100);
    expect(powered()).toEqual([true, false, true, true]);
  });
});

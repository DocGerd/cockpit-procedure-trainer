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
): CtslTrainerState => ({
  controls: breakers,
  guards: {},
  systems: { ...initial, altitudeFt, bus: { ...initial.bus, avionicsPowered } },
  devices: {},
});

describe('the SL40 install', () => {
  const install = devices.com;

  it('installs the sl40 device on the panel in its reserved slot', () => {
    expect(install).toMatchObject({ device: 'sl40', view: 'panel', placement: deviceSlots.com });
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
    const standIn = testDevices.find((device) => device.id === 'sl40');
    expect(Object.keys(standIn?.controls ?? {})).toEqual([
      'volume',
      'coarse',
      'fine',
      'swap',
      'monitor',
    ]);
  });
});

describe('the GTX 327 install', () => {
  const install = devices.xpdr;

  it('installs the gtx327 device in the transponder slot of the panel', () => {
    expect(install).toMatchObject({ device: 'gtx327', view: 'panel', placement: deviceSlots.xpdr });
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
    const standIn = testDevices.find((device) => device.id === 'gtx327');
    expect(Object.keys(standIn?.controls ?? {})).toEqual([
      'mode',
      'key0',
      'key1',
      'key2',
      'key3',
      'key4',
      'key5',
      'key6',
      'key7',
      'clr',
      'crsr',
      'vfr',
      'ident',
      'func',
      'startStop',
    ]);
  });
});

describe('the GPSMAP 496 install', () => {
  const install = devices.gps;

  it('installs the gpsmap496 device in the GPS slot of the panel', () => {
    expect(install).toMatchObject({
      device: 'gpsmap496',
      view: 'panel',
      placement: deviceSlots.gps,
    });
    expect(Object.keys(install.inputs)).toEqual(['groundSpeedKt', 'trackDeg']);
  });

  it('reads the airspeed as ground speed in knots and the heading as track', () => {
    const state = stateWith(true, {});
    const flying = {
      ...state,
      systems: { ...state.systems, airspeedKmh: 108 * KMH_PER_KT, headingDeg: 180 },
    };
    expect(install.inputs.groundSpeedKt(flying)).toBeCloseTo(108);
    expect(install.inputs.trackDeg(flying)).toBe(180);
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

  it('has a stand-in with the control ids of the device', () => {
    const standIn = testDevices.find((device) => device.id === 'gpsmap496');
    expect(Object.keys(standIn?.controls ?? {})).toEqual(['power', 'backlight', 'page', 'quit']);
  });
});

describe('the avionics master', () => {
  it('turns the radio, the transponder and the GPS off together, and on again', () => {
    const session = createSession(ctslAircraft, { devices: testDevices, phase: 'holding' });
    session.advance(100);
    const powered = () => [
      session.state().devices.com?.on,
      session.state().devices.xpdr?.on,
      session.state().devices.gps?.on,
    ];
    expect(powered()).toEqual([true, true, true]);

    session.set('avionicsMaster', 'off');
    session.advance(100);
    expect(powered()).toEqual([false, false, false]);

    session.set('avionicsMaster', 'on');
    session.advance(100);
    expect(powered()).toEqual([true, true, true]);
  });
});

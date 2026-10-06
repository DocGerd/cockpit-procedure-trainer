import { describe, expect, it } from 'vitest';
import { devices } from './devices';
import { initial } from './systems';
import type { CtslTrainerState } from './systems';
import { testDevices } from './test-devices';
import { deviceSlots } from './views';

const stateWith = (avionicsPowered: boolean, comBreaker: string): CtslTrainerState => ({
  controls: { comBreaker },
  systems: { ...initial, bus: { ...initial.bus, avionicsPowered } },
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
    expect(install.powered(stateWith(bus, breaker))).toBe(expected);
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

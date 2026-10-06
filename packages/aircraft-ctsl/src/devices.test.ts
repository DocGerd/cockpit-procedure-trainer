import { describe, expect, it } from 'vitest';
import { devices } from './devices';
import { initial } from './systems';
import type { CtslTrainerState } from './systems';
import { testDevices } from './test-devices';
import { stackSlots, views } from './views';

const stateWith = (avionicsPowered: boolean, comBreaker: string): CtslTrainerState => ({
  controls: { comBreaker },
  systems: { ...initial, bus: { ...initial.bus, avionicsPowered } },
  devices: {},
});

describe('the SL40 install', () => {
  const install = devices.com;

  it('installs the sl40 device on the panel in its reserved slot', () => {
    expect(install).toMatchObject({ device: 'sl40', view: 'radios', placement: stackSlots.com });
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

  it('keeps the stack slots inside the radio view and the transponder slot below the radio', () => {
    const { width, height } = views.radios.size;
    for (const { rect } of Object.values(stackSlots)) {
      expect(rect.x + rect.w).toBeLessThanOrEqual(width);
      expect(rect.y + rect.h).toBeLessThanOrEqual(height);
    }
    expect(stackSlots.com.rect.y + stackSlots.com.rect.h).toBeLessThanOrEqual(
      stackSlots.xpdr.rect.y,
    );
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

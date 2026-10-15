import { describe, expect, it } from 'vitest';
import type { Aircraft, Text } from '../contract';
import { defineDevice } from './define-device';
import { deviceCues } from './device-cues';
import type { DeviceStates } from './device-runtime';
import { engineMonitor, fixtureDeviceAircraft } from './fixtures';

const text: Text = { de: 'a', en: 'a' };

type BuzzerState = { readonly alarm: boolean };

const buzzer = defineDevice({
  id: 'buzzer',
  manual: text,
  notModelled: [],
  controls: {},
  initial: { alarm: false } as BuzzerState,
  step: (state) => state,
  sounds: {
    beeps: { alert: [{ hz: 880, ms: 100 }], ack: [{ hz: 440, ms: 50 }] },
    cues: (previous, next) => [
      ...(!previous.alarm && next.alarm ? [{ beep: 'alert' as const }] : []),
      ...(previous.alarm && !next.alarm ? [{ beep: 'ack' as const, level: 0.5 }] : []),
    ],
  },
});

const install = (device: string) =>
  ({
    device,
    view: 'panel',
    placement: { rect: { x: 0, y: 0, w: 10, h: 10 } },
    powered: () => true,
    inputs: {},
  }) as const;

const aircraft = {
  ...fixtureDeviceAircraft,
  devices: { mon: install('engineMonitor'), left: install('buzzer'), right: install('buzzer') },
} as unknown as Aircraft;

const registry = [engineMonitor, buzzer];

const states = (left: boolean, right: boolean): DeviceStates => ({
  mon: { on: true, state: engineMonitor.initial },
  left: { on: true, state: { alarm: left } },
  right: { on: true, state: { alarm: right } },
});

describe('deviceCues', () => {
  it('tags each cue with its install and device id', () => {
    expect(deviceCues(aircraft, registry, states(false, false), states(true, false))).toEqual([
      { beep: 'alert', install: 'left', device: 'buzzer' },
    ]);
  });

  it('keeps the cue level and walks the installs in order', () => {
    expect(deviceCues(aircraft, registry, states(true, false), states(false, true))).toEqual([
      { beep: 'ack', level: 0.5, install: 'left', device: 'buzzer' },
      { beep: 'alert', install: 'right', device: 'buzzer' },
    ]);
  });

  it('returns nothing when no state changed', () => {
    const same = states(true, true);
    expect(deviceCues(aircraft, registry, same, same)).toEqual([]);
  });

  it('returns nothing for devices without sounds', () => {
    const only = { ...aircraft, devices: { mon: install('engineMonitor') } } as unknown as Aircraft;
    expect(deviceCues(only, registry, states(false, false), states(true, true))).toEqual([]);
  });

  it('returns nothing for an aircraft without devices', () => {
    const bare = { ...aircraft, devices: undefined } as unknown as Aircraft;
    expect(deviceCues(bare, registry, states(false, false), states(true, true))).toEqual([]);
  });

  it('skips an install missing from either state set', () => {
    const withoutLeft: DeviceStates = { ...states(true, true) };
    delete (withoutLeft as Record<string, unknown>).left;
    expect(deviceCues(aircraft, registry, states(false, false), withoutLeft)).toEqual([
      { beep: 'alert', install: 'right', device: 'buzzer' },
    ]);
    expect(deviceCues(aircraft, registry, withoutLeft, states(true, true))).toEqual([]);
  });

  it('throws on an install that names an unknown device', () => {
    expect(() =>
      deviceCues(aircraft, [engineMonitor], states(false, false), states(true, true)),
    ).toThrow('Install "left" names unknown device "buzzer"');
  });
});

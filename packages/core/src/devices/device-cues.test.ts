import { describe, expect, it } from 'vitest';
import type { Aircraft, DeviceInstall, DeviceState, SoundCue, Text } from '../contract';
import { defineDevice } from './define-device';
import { deviceCues } from './device-cues';
import type { DeviceStates } from './device-runtime';
import { fixtureDeviceAircraft } from './fixtures';

const text: Text = { de: 'a', en: 'a' };

type BuzzerState = { readonly alarm: boolean; readonly selfTest: boolean };

const buzzer = defineDevice({
  id: 'buzzer',
  manual: text,
  notModelled: [],
  controls: {},
  initial: { alarm: false, selfTest: false } as BuzzerState,
  step: (state) => state,
  sounds: {
    beeps: { alert: [{ hz: 880, ms: 100 }], ack: [{ hz: 440, ms: 50 }] },
    cues: (previous, next) => [
      ...(!previous.alarm && next.alarm ? [{ beep: 'alert' as const }] : []),
      ...(previous.alarm && !next.alarm ? [{ beep: 'ack' as const, level: 0.5 }] : []),
      ...(!previous.selfTest && next.selfTest
        ? [{ beep: 'ack' as const }, { beep: 'alert' as const }]
        : []),
    ],
  },
});

const silent = defineDevice({
  id: 'silent',
  manual: text,
  notModelled: [],
  controls: {},
  initial: { count: 0 },
  step: (state) => state,
});

const install = (device: string): DeviceInstall<unknown> => ({
  device,
  view: 'panel',
  placement: { rect: { x: 0, y: 0, w: 10, h: 10 } },
  powered: () => true,
  inputs: {},
});

const withInstalls = (devices: Record<string, DeviceInstall<unknown>>) =>
  ({ ...fixtureDeviceAircraft, devices }) satisfies Aircraft;

const aircraft = withInstalls({
  quiet: install('silent'),
  left: install('buzzer'),
  right: install('buzzer'),
});

const registry = [silent, buzzer];

const buzz = (alarm: boolean, selfTest = false, on = true): DeviceState => ({
  on,
  state: { alarm, selfTest },
});
const quiet = (count: number): DeviceState => ({ on: true, state: { count } });

describe('deviceCues', () => {
  it('tags each cue with its install and device id', () => {
    const previous = { quiet: quiet(0), left: buzz(false), right: buzz(false) };
    const next = { quiet: quiet(0), left: buzz(true), right: buzz(false) };
    expect(deviceCues(aircraft, registry, previous, next)).toEqual([
      { beep: 'alert', install: 'left', device: 'buzzer' },
    ]);
  });

  it('follows the install order, then the order and level each device gives', () => {
    const previous: DeviceStates = { right: buzz(false), left: buzz(true), quiet: quiet(0) };
    const next: DeviceStates = { right: buzz(false, true), left: buzz(false), quiet: quiet(0) };
    expect(deviceCues(aircraft, registry, previous, next)).toEqual([
      { beep: 'ack', level: 0.5, install: 'left', device: 'buzzer' },
      { beep: 'ack', install: 'right', device: 'buzzer' },
      { beep: 'alert', install: 'right', device: 'buzzer' },
    ]);
  });

  it("adds a later install's cues after an install that gives none", () => {
    const previous = { quiet: quiet(0), left: buzz(false), right: buzz(false) };
    const next = { quiet: quiet(0), left: buzz(false), right: buzz(false, true) };
    expect(deviceCues(aircraft, registry, previous, next)).toEqual([
      { beep: 'ack', install: 'right', device: 'buzzer' },
      { beep: 'alert', install: 'right', device: 'buzzer' },
    ]);
  });

  it('returns nothing when no state changed', () => {
    const same = { quiet: quiet(0), left: buzz(true), right: buzz(true) };
    expect(deviceCues(aircraft, registry, same, same)).toEqual([]);
  });

  it('returns nothing for a device without sounds whose state changed', () => {
    const only = withInstalls({ quiet: install('silent') });
    expect(deviceCues(only, registry, { quiet: quiet(0) }, { quiet: quiet(1) })).toEqual([]);
  });

  it("passes only the device state, not the install's on flag", () => {
    const previous = { quiet: quiet(0), left: buzz(false, false, false), right: buzz(false) };
    const next = { quiet: quiet(0), left: buzz(false), right: buzz(false, false, false) };
    expect(deviceCues(aircraft, registry, previous, next)).toEqual([]);
  });

  it('returns nothing for an aircraft without devices', () => {
    const bare = { ...aircraft, devices: undefined } as unknown as Aircraft;
    const all = { quiet: quiet(0), left: buzz(false), right: buzz(false) };
    expect(deviceCues(bare, registry, all, { ...all, left: buzz(true) })).toEqual([]);
  });

  it('skips an install missing from either state set', () => {
    const off = { quiet: quiet(0), left: buzz(false), right: buzz(false) };
    const on = { quiet: quiet(0), left: buzz(true), right: buzz(true) };
    expect(deviceCues(aircraft, registry, off, { quiet: quiet(0), right: buzz(true) })).toEqual([
      { beep: 'alert', install: 'right', device: 'buzzer' },
    ]);
    expect(deviceCues(aircraft, registry, { quiet: quiet(0), left: buzz(false) }, on)).toEqual([
      { beep: 'alert', install: 'left', device: 'buzzer' },
    ]);
  });

  it('reads only own entries of the state sets', () => {
    const inherited = withInstalls({ constructor: install('buzzer') });
    expect(deviceCues(inherited, registry, {}, { constructor: buzz(true) })).toEqual([]);
  });

  it('tags a cue with the real ids over any it carries', () => {
    const stray = defineDevice({
      id: 'stray',
      manual: text,
      notModelled: [],
      controls: {},
      initial: { count: 0 },
      step: (state) => state,
      sounds: {
        beeps: { tick: [{ hz: 1000, ms: 10 }] },
        cues: (previous, next) =>
          previous.count === next.count
            ? []
            : [{ beep: 'tick', install: 'other', device: 'other' } as SoundCue<'tick'>],
      },
    });
    const one = withInstalls({ s: install('stray') });
    expect(deviceCues(one, [stray], { s: quiet(0) }, { s: quiet(1) })).toEqual([
      { beep: 'tick', install: 's', device: 'stray' },
    ]);
  });

  it('throws on an install that names an unknown device, whatever its state', () => {
    const all = { quiet: quiet(0), left: buzz(false), right: buzz(false) };
    expect(() => deviceCues(aircraft, [silent], all, { ...all, left: buzz(true) })).toThrow(
      'Install "left" names unknown device "buzzer"',
    );
    expect(() => deviceCues(aircraft, [silent], {}, {})).toThrow(
      'Install "left" names unknown device "buzzer"',
    );
  });
});

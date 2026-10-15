import { describe, expect, it } from 'vitest';
import { defineDevice } from '../devices/define-device';
import { defineAircraft, everyPhase } from './index';
import type { Text, TrainerState } from './index';

type State = { on: boolean };

const text: Text = { de: 'Text', en: 'Text' };
const environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };
const initial: State = { on: false };
const condition = (state: TrainerState<State>) => state.systems.on;

const toggle = {
  kind: 'toggle',
  positions: ['off', 'on'],
  initial: 'off',
  name: text,
  description: text,
} as const;

const body = {
  id: 'mini',
  name: text,
  handbookRevision: text,
  controls: { master: toggle },
  indicators: {},
  views: { main: { name: text, image: 'panel.png' }, side: { name: text, image: 'side.png' } },
  systems: { initial, step: (state: State) => state },
  failures: {},
  phases: everyPhase({
    image: 'parking.png',
    environment,
    entry: { controls: { master: 'off' }, state: initial },
  }),
  procedures: {},
} as const;

const install = {
  device: 'monitor',
  view: 'main',
  placement: { rect: { x: 0, y: 0, w: 10, h: 10 } },
  powered: condition,
  inputs: { rpm: () => 0 },
} as const;

describe('device ids and installs', () => {
  it('accepts a device control as an action target and as a check target', () => {
    const aircraft = defineAircraft({
      ...body,
      devices: { mon: install },
      procedures: {
        p: {
          title: text,
          type: 'normal',
          startPhase: 'parking',
          items: [
            { type: 'action', control: 'mon.page', position: 'electrical', text },
            { type: 'action', control: 'mon.dim', position: 0.5, text },
            { type: 'check', target: { control: 'mon.page' }, condition, text },
          ],
        },
      },
    });
    expect(aircraft.devices?.mon?.device).toBe('monitor');
  });

  it('still rejects an id without a namespace that names no aircraft control', () => {
    defineAircraft({
      ...body,
      devices: { mon: install },
      procedures: {
        p: {
          title: text,
          type: 'normal',
          startPhase: 'parking',
          items: [
            // @ts-expect-error page names no aircraft control and carries no install prefix
            { type: 'action', control: 'page', position: 'electrical', text },
            // @ts-expect-error page names no aircraft control and carries no install prefix
            { type: 'check', target: { control: 'page' }, condition, text },
          ],
        },
      },
    });
  });

  it('keeps checking the position of an aircraft control', () => {
    defineAircraft({
      ...body,
      procedures: {
        p: {
          title: text,
          type: 'normal',
          startPhase: 'parking',
          items: [
            // @ts-expect-error 'onn' is not a position of master
            { type: 'action', control: 'master', position: 'onn', text },
          ],
        },
      },
    });
  });

  it('accepts device control positions in a phase entry and rejects non-positions', () => {
    const entry = { controls: { master: 'off' }, state: initial } as const;
    defineAircraft({
      ...body,
      devices: { mon: install },
      phases: {
        ...body.phases,
        parking: { ...body.phases.parking, entry: { ...entry, devices: { mon: { page: 'a' } } } },
      },
    });
    defineAircraft({
      ...body,
      devices: { mon: install },
      phases: {
        ...body.phases,
        parking: {
          ...body.phases.parking,
          // @ts-expect-error a position is a string or a number
          entry: { ...entry, devices: { mon: { page: true } } },
        },
      },
    });
  });

  it('accepts an install in any declared view', () => {
    defineAircraft({ ...body, devices: { mon: { ...install, view: 'side' } } });
  });

  it('rejects an install placed in an unknown view', () => {
    defineAircraft({
      ...body,
      devices: {
        // @ts-expect-error nowhere is not a view
        mon: { ...install, view: 'nowhere' },
      },
    });
  });

  it('rejects an install without a powered condition or a placement', () => {
    defineAircraft({
      ...body,
      devices: {
        // @ts-expect-error powered is missing
        a: { device: 'monitor', view: 'main', placement: install.placement, inputs: {} },
        // @ts-expect-error placement is missing
        b: { device: 'monitor', view: 'main', powered: condition, inputs: {} },
      },
    });
  });

  it('types an install input as a number, boolean or string reading', () => {
    defineAircraft({
      ...body,
      devices: {
        mon: {
          ...install,
          inputs: {
            on: (state: TrainerState<State>) => state.systems.on,
            // @ts-expect-error an object is not a number, boolean or string
            bad: () => ({}),
          },
        },
      },
    });
  });
});

describe('device sounds', () => {
  const device = {
    id: 'beeper',
    manual: text,
    notModelled: [],
    controls: {},
    initial: { alarm: false },
    step: (state: { alarm: boolean }) => state,
  } as const;
  const beep = [{ hz: 880, ms: 100 }];

  it('accepts cues that name declared beeps', () => {
    defineDevice({
      ...device,
      sounds: {
        beeps: { alert: [{ hz: 880, ms: 100 }], ack: [{ hz: 440, ms: 50, pauseMs: 20 }] },
        cues: (previous, next) =>
          !previous.alarm && next.alarm ? [{ beep: 'alert' }, { beep: 'ack', level: 0.5 }] : [],
      },
    });
  });

  it('rejects a cue that names an undeclared beep', () => {
    defineDevice({
      ...device,
      sounds: {
        beeps: { alert: beep, ack: beep },
        // @ts-expect-error 'alarm' is not a declared beep
        cues: () => [{ beep: 'alarm' }],
      },
    });
    defineDevice({
      ...device,
      sounds: {
        beeps: {},
        // @ts-expect-error the device declares no beep
        cues: () => [{ beep: 'alert' }],
      },
    });
  });

  it('leaves sounds out of a device that declares none', () => {
    expect(defineDevice(device).sounds).toBeUndefined();
  });

  it('accepts a click on a control and rejects an unknown click id', () => {
    defineAircraft({ ...body, controls: { master: { ...toggle, click: 'rocker' } } });
    defineAircraft({ ...body, controls: { master: { ...toggle, click: 'silent' } } });
    defineAircraft({
      ...body,
      // @ts-expect-error 'squeak' is not a click id
      controls: { master: { ...toggle, click: 'squeak' } },
    });
    const key = {
      kind: 'momentary',
      positions: ['up', 'down'],
      initial: 'up',
      name: text,
      description: text,
    } as const;
    defineDevice({ ...device, controls: { key: { ...key, click: 'key' } } });
    // @ts-expect-error 'squeak' is not a click id
    defineDevice({ ...device, controls: { key: { ...key, click: 'squeak' } } });
  });

  it('types sound inputs from the aircraft state', () => {
    defineAircraft({
      ...body,
      sounds: {
        engine: {
          voice: 'piston',
          options: { cylinders: 4 },
          inputs: { running: (state) => (state.systems.on ? 1 : 0) },
          carried: ['running'],
        },
      },
    });
  });

  it('rejects inputs that are not numbers from the state, and options that are not JSON', () => {
    defineAircraft({
      ...body,
      sounds: {
        missing: {
          voice: 'piston',
          // @ts-expect-error the state has no 'missing'
          inputs: { level: (state) => (state.systems.missing ? 1 : 0) },
        },
        flag: {
          voice: 'piston',
          // @ts-expect-error an input is a number: a boolean is written as 0 or 1
          inputs: { level: (state) => state.systems.on },
        },
        word: {
          voice: 'piston',
          // @ts-expect-error an input is a number
          inputs: { level: () => 'loud' },
        },
        code: {
          voice: 'piston',
          // @ts-expect-error an option is JSON
          options: { start: () => 1 },
        },
      },
    });
  });
});

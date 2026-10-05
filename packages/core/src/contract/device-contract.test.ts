import { describe, expect, it } from 'vitest';
import { defineAircraft } from './index';
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
  handbookRevision: 'rev 1',
  controls: { master: toggle },
  indicators: {},
  views: { main: { name: text, image: 'panel.png' }, side: { name: text, image: 'side.png' } },
  systems: { initial, step: (state: State) => state },
  failures: {},
  phases: {
    parking: {
      name: text,
      image: 'parking.png',
      environment,
      entry: { controls: { master: 'off' }, state: initial },
    },
  },
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
        parking: { ...body.phases.parking, entry: { ...entry, devices: { mon: { page: 'a' } } } },
      },
    });
    defineAircraft({
      ...body,
      devices: { mon: install },
      phases: {
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

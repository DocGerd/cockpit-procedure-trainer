import { describe, expect, it } from 'vitest';
import { CONTRACT_VERSION, defineAircraft } from './index';
import type { Aircraft, ControlChange, ControlPosition, GuardPosition } from './index';
import type { Text, TrainerState } from './index';
import { fixtureAircraft } from './fixtures';

type State = { on: boolean };

const text: Text = { de: 'Text', en: 'Text' };
const environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };

const toggle = {
  kind: 'toggle',
  positions: ['off', 'on'],
  initial: 'off',
  name: text,
  description: text,
} as const;

const breaker = {
  kind: 'breaker',
  positions: ['in', 'pulled'],
  initial: 'in',
  name: text,
  description: text,
} as const;

const rotary = {
  kind: 'rotary',
  positions: ['off', 'both', 'start'],
  initial: 'off',
  springBack: { start: 'both' },
  name: text,
  description: text,
} as const;

const initial: State = { on: false };
const select = (state: TrainerState<State>) => state.systems.on;
const systems = { initial, step: (state: State) => state };
const lamp = { name: text, select, appearance: { widget: 'lamp' } } as const;
const phase = {
  name: text,
  image: 'parking.png',
  environment,
  entry: { controls: { master: 'off', cb: 'in' }, state: initial },
} as const;
const view = { name: text, image: 'panel.png' } as const;
const condition = (state: TrainerState<State>) => state.systems.on;

const identity = { id: 'mini', name: text, handbookRevision: 'rev 1' } as const;

const body = {
  controls: { master: toggle, cb: breaker },
  indicators: { lamp },
  views: { main: view },
  systems,
  failures: { alt: { name: text, trips: ['cb'] } },
  phases: { parking: phase },
  procedures: {},
} as const;

describe('defineAircraft', () => {
  it('returns its input plus the contract version', () => {
    const definition = { ...identity, ...body };
    const aircraft = defineAircraft(definition);
    expect(aircraft).toEqual({ ...definition, contractVersion: CONTRACT_VERSION });
    expect(aircraft.controls).toBe(definition.controls);
  });

  it('stamps the contract version on the fixture', () => {
    expect(fixtureAircraft.contractVersion).toBe(CONTRACT_VERSION);
    expect(Object.keys(fixtureAircraft.procedures)).toEqual(['beforeStart', 'alternatorFailure']);
  });
});

describe('erased Aircraft', () => {
  it('types failure trips as plain string ids', () => {
    const trips: NonNullable<Aircraft['failures'][string]['trips']> = ['anything'];
    const plain: readonly string[] = trips;
    const back: NonNullable<Aircraft['failures'][string]['trips']> = plain;
    expect(back).toEqual(['anything']);
  });

  it('narrows a ControlChange on its kind', () => {
    const toPosition = (change: ControlChange): ControlPosition | GuardPosition => {
      if (change.kind === 'guard') {
        // @ts-expect-error guard positions are not numbers
        const asNumber: number = change.to;
        return asNumber;
      }
      const position: ControlPosition = change.to;
      return position;
    };
    expect(toPosition({ id: 'x', kind: 'position', from: 1, to: 2, source: 'pilot' })).toBe(2);
  });
});

describe('compile-time reference checks', () => {
  it('accepts a valid aircraft', () => {
    const aircraft = defineAircraft({
      ...identity,
      ...body,
      controls: { master: toggle, cb: breaker, ignition: rotary },
      phases: {
        parking: {
          ...phase,
          entry: { controls: { master: 'off', cb: 'in', ignition: 'start' }, state: initial },
        },
      },
      procedures: {
        p: {
          title: text,
          type: 'normal',
          startPhase: 'parking',
          items: [
            { type: 'action', control: 'master', position: 'on', text },
            { type: 'action', control: 'cb', position: 'pulled', text },
            { type: 'check', target: { indicator: 'lamp' }, condition, text },
            { type: 'check', target: { control: 'master' }, condition, text },
            { type: 'confirm', text },
          ],
        },
        e: { title: text, type: 'emergency', startPhase: 'parking', failure: 'alt', items: [] },
      },
    });
    expect(Object.keys(aircraft.procedures)).toEqual(['p', 'e']);
  });

  it('rejects an action item that targets an unknown control', () => {
    defineAircraft({
      ...identity,
      ...body,
      procedures: {
        p: {
          title: text,
          type: 'normal',
          startPhase: 'parking',
          items: [
            // @ts-expect-error unknown control
            { type: 'action', control: 'nope', position: 'on', text },
          ],
        },
      },
    });
  });

  it('rejects a check that targets an unknown indicator or control', () => {
    defineAircraft({
      ...identity,
      ...body,
      procedures: {
        p: {
          title: text,
          type: 'normal',
          startPhase: 'parking',
          items: [
            // @ts-expect-error unknown indicator
            { type: 'check', target: { indicator: 'nope' }, condition, text },
            // @ts-expect-error unknown control
            { type: 'check', target: { control: 'nope' }, condition, text },
          ],
        },
      },
    });
  });

  it('rejects a procedure that names an unknown phase', () => {
    defineAircraft({
      ...identity,
      ...body,
      procedures: {
        // @ts-expect-error unknown start phase
        p: { title: text, type: 'normal', startPhase: 'nope', items: [] },
        q: {
          title: text,
          type: 'normal',
          startPhase: 'parking',
          // @ts-expect-error unknown end phase
          endPhase: 'nope',
          items: [],
        },
      },
    });
  });

  it('rejects an emergency procedure with an unknown failure or none', () => {
    defineAircraft({
      ...identity,
      ...body,
      procedures: {
        p: {
          title: text,
          type: 'emergency',
          startPhase: 'parking',
          // @ts-expect-error unknown failure
          failure: 'nope',
          items: [],
        },
        // @ts-expect-error emergency needs a failure
        q: { title: text, type: 'emergency', startPhase: 'parking', items: [] },
      },
    });
  });

  it('rejects a failure that trips an unknown control or a non-breaker', () => {
    defineAircraft({
      ...identity,
      ...body,
      failures: {
        // @ts-expect-error unknown control
        a: { name: text, trips: ['nope'] },
        // @ts-expect-error master is a toggle, not a breaker
        b: { name: text, trips: ['master'] },
      },
    });
  });

  it('rejects a Text without de or en', () => {
    defineAircraft({
      ...identity,
      ...body,
      // @ts-expect-error en is missing
      name: { de: 'Nur Deutsch' },
    });
    defineAircraft({
      ...identity,
      ...body,
      // @ts-expect-error de is missing
      name: { en: 'English only' },
    });
  });

  it('rejects a placement that names an unknown control or indicator', () => {
    const rect = { x: 0, y: 0, w: 1, h: 1 };
    defineAircraft({
      ...identity,
      ...body,
      views: {
        main: {
          ...view,
          controls: {
            master: { rect },
            // @ts-expect-error unknown control
            nope: { rect },
          },
          indicators: {
            lamp: { rect },
            // @ts-expect-error unknown indicator
            nope: { rect },
          },
        },
      },
    });
  });

  it('rejects an aircraft without name or handbookRevision', () => {
    // @ts-expect-error name is missing
    defineAircraft({ id: 'mini', handbookRevision: 'rev 1', ...body });
    // @ts-expect-error handbookRevision is missing
    defineAircraft({ id: 'mini', name: text, ...body });
  });

  it('rejects an appearance that holds a function', () => {
    defineAircraft({
      ...identity,
      ...body,
      indicators: {
        lamp: {
          ...lamp,
          // @ts-expect-error appearance options are plain data
          appearance: { widget: 'lamp', options: { format: () => 'x' } },
        },
      },
    });
  });

  it('rejects an entry snapshot that names an unknown control', () => {
    defineAircraft({
      ...identity,
      ...body,
      phases: {
        parking: {
          ...phase,
          entry: {
            state: initial,
            // @ts-expect-error unknown control
            controls: { master: 'off', cb: 'in', nope: 'x' },
          },
        },
      },
    });
  });
});

describe('compile-time position checks', () => {
  it('rejects an initial position the control does not have', () => {
    defineAircraft({
      ...identity,
      ...body,
      controls: {
        // @ts-expect-error 'of' is not a position of master
        master: { ...toggle, initial: 'of' },
        cb: breaker,
      },
    });
  });

  it('rejects an entry snapshot position the control does not have', () => {
    defineAircraft({
      ...identity,
      ...body,
      phases: {
        parking: {
          ...phase,
          entry: {
            state: initial,
            controls: {
              // @ts-expect-error 'onn' is not a position of master
              master: 'onn',
              // @ts-expect-error 'out' is not a position of a breaker
              cb: 'out',
            },
          },
        },
      },
    });
  });

  it('rejects an action position the control does not have', () => {
    defineAircraft({
      ...identity,
      ...body,
      procedures: {
        p: {
          title: text,
          type: 'normal',
          startPhase: 'parking',
          items: [
            // @ts-expect-error 'onn' is not a position of master
            { type: 'action', control: 'master', position: 'onn', text },
            // @ts-expect-error 'out' is not a position of a breaker
            { type: 'action', control: 'cb', position: 'out', text },
          ],
        },
      },
    });
  });

  it('rejects breaker positions other than in and pulled', () => {
    defineAircraft({
      ...identity,
      ...body,
      controls: {
        master: toggle,
        // @ts-expect-error breakers have exactly in and pulled
        cb: { ...breaker, positions: ['in', 'out'] },
      },
    });
  });

  it('rejects a spring-back detent the rotary does not have', () => {
    defineAircraft({
      ...identity,
      ...body,
      controls: {
        master: toggle,
        cb: breaker,
        // @ts-expect-error 'strat' is not a detent
        ignition: { ...rotary, springBack: { strat: 'both' } },
      },
      phases: {
        parking: {
          ...phase,
          entry: { controls: { master: 'off', cb: 'in', ignition: 'off' }, state: initial },
        },
      },
    });
    defineAircraft({
      ...identity,
      ...body,
      controls: {
        master: toggle,
        cb: breaker,
        // @ts-expect-error 'bothh' is not a detent
        ignition: { ...rotary, springBack: { start: 'bothh' } },
      },
      phases: {
        parking: {
          ...phase,
          entry: { controls: { master: 'off', cb: 'in', ignition: 'off' }, state: initial },
        },
      },
    });
  });

  it('rejects an artwork image for a position the control does not have', () => {
    defineAircraft({
      ...identity,
      ...body,
      controls: {
        master: {
          ...toggle,
          appearance: {
            artwork: {
              face: 'face.png',
              // @ts-expect-error the images are keyed 'off' and 'onn', not 'off' and 'on'
              moving: { type: 'positions', images: { off: 'off.png', onn: 'on.png' } },
            },
          },
        },
        cb: breaker,
      },
    });
  });
});

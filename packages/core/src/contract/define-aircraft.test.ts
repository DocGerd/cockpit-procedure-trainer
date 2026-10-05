import { describe, expect, it } from 'vitest';
import { CONTRACT_VERSION, defineAircraft } from './index';
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

const breaker = { kind: 'breaker', initial: 'in', name: text, description: text } as const;

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
  procedures: [],
} as const;

describe('defineAircraft', () => {
  it('returns its input plus the contract version', () => {
    const definition = { ...identity, ...body };
    const aircraft = defineAircraft(definition);
    expect(aircraft).toEqual({ ...definition, contractVersion: CONTRACT_VERSION });
    expect(aircraft.controls).toBe(definition.controls);
  });

  it('returns the shared fixture unchanged apart from the version', () => {
    expect(fixtureAircraft.contractVersion).toBe(CONTRACT_VERSION);
    expect(Object.keys(fixtureAircraft.controls)).toContain('ignition');
  });
});

describe('compile-time reference checks', () => {
  it('accepts a valid aircraft', () => {
    const aircraft = defineAircraft({
      ...identity,
      ...body,
      procedures: [
        {
          id: 'p',
          title: text,
          type: 'normal',
          startPhase: 'parking',
          items: [
            { type: 'action', control: 'master', position: 'on', text },
            { type: 'check', target: { indicator: 'lamp' }, condition, text },
            { type: 'check', target: { control: 'master' }, condition, text },
            { type: 'confirm', text },
          ],
        },
        {
          id: 'e',
          title: text,
          type: 'emergency',
          startPhase: 'parking',
          failure: 'alt',
          items: [],
        },
      ],
    });
    expect(aircraft.procedures).toHaveLength(2);
  });

  it('rejects an action item that targets an unknown control', () => {
    defineAircraft({
      ...identity,
      ...body,
      procedures: [
        {
          id: 'p',
          title: text,
          type: 'normal',
          startPhase: 'parking',
          items: [
            // @ts-expect-error unknown control
            { type: 'action', control: 'nope', position: 'on', text },
          ],
        },
      ],
    });
  });

  it('rejects a check that targets an unknown indicator or control', () => {
    defineAircraft({
      ...identity,
      ...body,
      procedures: [
        {
          id: 'p',
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
      ],
    });
  });

  it('rejects a procedure that names an unknown phase', () => {
    defineAircraft({
      ...identity,
      ...body,
      procedures: [
        // @ts-expect-error unknown start phase
        { id: 'p', title: text, type: 'normal', startPhase: 'nope', items: [] },
        {
          id: 'q',
          title: text,
          type: 'normal',
          startPhase: 'parking',
          // @ts-expect-error unknown end phase
          endPhase: 'nope',
          items: [],
        },
      ],
    });
  });

  it('rejects an emergency procedure with an unknown failure or none', () => {
    defineAircraft({
      ...identity,
      ...body,
      procedures: [
        {
          id: 'p',
          title: text,
          type: 'emergency',
          startPhase: 'parking',
          // @ts-expect-error unknown failure
          failure: 'nope',
          items: [],
        },
        // @ts-expect-error emergency needs a failure
        { id: 'q', title: text, type: 'emergency', startPhase: 'parking', items: [] },
      ],
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

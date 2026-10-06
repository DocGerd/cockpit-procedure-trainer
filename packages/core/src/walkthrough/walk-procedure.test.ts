import { describe, expect, it } from 'vitest';
import { defineAircraft } from '../contract';
import type {
  Aircraft,
  ControlRecord,
  ProcedureItem,
  SystemsDefinition,
  Text,
  TrainerState,
} from '../contract';
import { fixtureAircraft } from '../contract/fixtures';
import { engineMonitor, fixtureDeviceAircraft } from '../devices/fixtures';
import { MAX_STEPS, walkProcedure } from './index';

type ClockState = { readonly ms: number; readonly heldMs: number; readonly keyMs: number };
type Items = readonly ProcedureItem<ClockState, ControlRecord, never>[];

const text = (de: string, en: string): Text => ({ de, en });
const environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };
const initial: ClockState = { ms: 0, heldMs: 0, keyMs: 0 };
const ms = (atLeast: number) => (state: TrainerState<ClockState>) => state.systems.ms >= atLeast;
const heldMs = (atLeast: number) => (state: TrainerState<ClockState>) =>
  state.systems.heldMs >= atLeast;
const keyMs = (atLeast: number) => (state: TrainerState<ClockState>) =>
  state.systems.keyMs >= atLeast;
const never = () => false;
const keyReleased = (state: TrainerState<ClockState>) => state.controls.key === 'both';
const buttonReleased = (state: TrainerState<ClockState>) => state.controls.button === 'rest';

const clockAircraft = (items: Items, step?: SystemsDefinition<ClockState>['step']): Aircraft =>
  defineAircraft({
    id: 'clock',
    name: text('Uhr', 'Clock'),
    handbookRevision: 'fixture',
    controls: {
      master: {
        kind: 'toggle',
        positions: ['off', 'on'],
        initial: 'off',
        name: text('Haupt', 'Master'),
        description: text('Haupt', 'Master'),
      },
      button: {
        kind: 'momentary',
        positions: ['rest', 'held'],
        initial: 'rest',
        name: text('Taste', 'Button'),
        description: text('Taste', 'Button'),
      },
      key: {
        kind: 'rotary',
        positions: ['off', 'both', 'start'],
        initial: 'off',
        springBack: { start: 'both' },
        name: text('Schlüssel', 'Key'),
        description: text('Schlüssel', 'Key'),
      },
      cover: {
        kind: 'guarded',
        positions: ['off', 'on'],
        initial: 'off',
        guard: { name: text('Kappe', 'Cover') },
        name: text('Kappenschalter', 'Covered switch'),
        description: text('Kappenschalter', 'Covered switch'),
      },
    },
    indicators: {},
    views: { panel: { name: text('Tafel', 'Panel'), image: 'panel.png' } },
    systems: {
      initial,
      step:
        step ??
        ((state: ClockState, { controls, dtMs }) => ({
          ms: controls.master === 'on' ? state.ms + dtMs : state.ms,
          heldMs: controls.button === 'held' ? state.heldMs + dtMs : state.heldMs,
          keyMs: controls.key === 'start' ? state.keyMs + dtMs : state.keyMs,
        })),
    },
    failures: {},
    phases: {
      start: {
        name: text('Start', 'Start'),
        image: 'start.png',
        environment,
        entry: {
          controls: { master: 'off', button: 'rest', key: 'off', cover: 'off' },
          state: initial,
        },
      },
    },
    procedures: {
      run: { title: text('Ablauf', 'Run'), type: 'normal', startPhase: 'start', items },
    },
  }) as Aircraft;

const walk = (items: Items, step?: SystemsDefinition<ClockState>['step']) =>
  walkProcedure(clockAircraft(items, step), 'run');

const failingStep = (): ClockState => {
  throw new Error('systems broke');
};

const masterOn = {
  type: 'action',
  control: 'master',
  position: 'on',
  text: text('Haupt EIN', 'Master ON'),
} as const;

describe('walkProcedure', () => {
  it('completes the fixture aircraft procedures from the entry snapshot', () => {
    expect(walkProcedure(fixtureAircraft, 'beforeStart')).toEqual({ ok: true });
    expect(walkProcedure(fixtureAircraft, 'alternatorFailure')).toEqual({ ok: true });
  });

  it('performs items on device controls', () => {
    const result = walkProcedure(fixtureDeviceAircraft, 'monitorElectrical', {
      devices: [engineMonitor],
    });
    expect(result).toEqual({ ok: true });
  });

  it('waits for a check that becomes true only after time has passed', () => {
    const wait = {
      type: 'check',
      target: { control: 'master' },
      condition: ms(500),
      text: text('Zeit', 'Time'),
    } as const;
    expect(walk([masterOn, wait])).toEqual({ ok: true });
  });

  it('fails a check whose condition is never established, naming the item', () => {
    const impossible = {
      type: 'check',
      target: { control: 'master' },
      condition: never,
      text: text('Nie', 'Never true'),
    } as const;
    expect(walk([masterOn, impossible])).toEqual({
      ok: false,
      aircraft: 'clock',
      procedure: 'run',
      itemIndex: 1,
      item: 'Never true',
      reason: 'condition not met',
    });
  });

  it('holds a momentary control until the hold condition is met, then releases it', () => {
    const hold = {
      type: 'action',
      control: 'button',
      position: 'held',
      holdUntil: heldMs(500),
      text: text('Halten', 'Hold'),
    } as const;
    const released = {
      type: 'check',
      target: { control: 'button' },
      condition: buttonReleased,
      text: text('Losgelassen', 'Released'),
    } as const;
    expect(walk([hold, released])).toEqual({ ok: true });
  });

  it('presses and releases a momentary control without a hold condition', () => {
    const press = {
      type: 'action',
      control: 'button',
      position: 'held',
      text: text('Drücken', 'Press'),
    } as const;
    const released = {
      type: 'check',
      target: { control: 'button' },
      condition: buttonReleased,
      text: text('Losgelassen', 'Released'),
    } as const;
    expect(walk([press, released])).toEqual({ ok: true });
  });

  it('presses once per consecutive item on a momentary control', () => {
    const press = {
      type: 'action',
      control: 'button',
      position: 'held',
      text: text('Drücken', 'Press'),
    } as const;
    expect(walk([press, press, press])).toEqual({ ok: true });
  });

  it('presses once per consecutive item on a spring-back detent', () => {
    const start = {
      type: 'action',
      control: 'key',
      position: 'start',
      text: text('Starten', 'Key to START'),
    } as const;
    expect(walk([start, start])).toEqual({ ok: true });
  });

  it('advances time for a hold condition on a control that is not momentary', () => {
    expect(walk([{ ...masterOn, holdUntil: ms(500) }])).toEqual({ ok: true });
  });

  it('fails a hold condition that never becomes true instead of hanging', () => {
    const hold = {
      type: 'action',
      control: 'button',
      position: 'held',
      holdUntil: never,
      text: text('Ewig halten', 'Hold forever'),
    } as const;
    expect(walk([hold])).toEqual({
      ok: false,
      aircraft: 'clock',
      procedure: 'run',
      itemIndex: 0,
      item: 'Hold forever',
      reason: `hold condition not met within ${MAX_STEPS} steps`,
    });
  });

  it('opens a guard before setting a guarded control', () => {
    const cover = {
      type: 'action',
      control: 'cover',
      position: 'on',
      text: text('Kappe', 'Cover switch ON'),
    } as const;
    expect(walk([cover])).toEqual({ ok: true });
  });

  it('checks off confirm items', () => {
    expect(walk([{ type: 'confirm', text: text('Frei', 'Clear') }])).toEqual({ ok: true });
  });

  it('fails when the finished checklist holds a deviation, naming that item', () => {
    let calls = 0;
    const flaky = {
      type: 'check',
      target: { control: 'master' },
      condition: () => ++calls === 1,
      text: text('Flackert', 'Flaky'),
    } as const;
    expect(walk([flaky])).toEqual({
      ok: false,
      aircraft: 'clock',
      procedure: 'run',
      itemIndex: 0,
      item: 'Flaky',
      reason: 'unmet-check',
    });
  });

  it('fails an item that throws, naming it', () => {
    const wrong = {
      type: 'action',
      control: 'master',
      position: 'sideways',
      text: text('Falsch', 'Wrong'),
    };
    expect(walk([wrong] as unknown as Items)).toEqual({
      ok: false,
      aircraft: 'clock',
      procedure: 'run',
      itemIndex: 0,
      item: 'Wrong',
      reason: 'Control "master" has no position "sideways"',
    });
  });

  it('presses a spring-back detent and releases it', () => {
    const start = {
      type: 'action',
      control: 'key',
      position: 'start',
      text: text('Starten', 'Key to START'),
    } as const;
    const released = {
      type: 'check',
      target: { control: 'key' },
      condition: keyReleased,
      text: text('Zurückgefedert', 'Key sprang back'),
    } as const;
    expect(walk([start, released])).toEqual({ ok: true });
  });

  it('holds a spring-back detent until the hold condition is met', () => {
    const start = {
      type: 'action',
      control: 'key',
      position: 'start',
      holdUntil: keyMs(500),
      text: text('Starten', 'Key to START'),
    } as const;
    const released = {
      type: 'check',
      target: { control: 'key' },
      condition: keyReleased,
      text: text('Zurückgefedert', 'Key sprang back'),
    } as const;
    expect(walk([start, released])).toEqual({ ok: true });
  });

  it('fails an item once the systems model has failed', () => {
    expect(walk([masterOn, { type: 'confirm', text: text('Frei', 'Clear') }], failingStep)).toEqual(
      {
        ok: false,
        aircraft: 'clock',
        procedure: 'run',
        itemIndex: 0,
        item: 'Master ON',
        reason: 'runtime failed',
      },
    );
  });

  it('fails a procedure without items instead of passing it', () => {
    expect(walk([])).toEqual({
      ok: false,
      aircraft: 'clock',
      procedure: 'run',
      itemIndex: 0,
      item: '',
      reason: 'procedure has no items',
    });
  });

  it('throws for an unknown procedure', () => {
    expect(() => walkProcedure(fixtureAircraft, 'nope')).toThrow('nope');
  });
});

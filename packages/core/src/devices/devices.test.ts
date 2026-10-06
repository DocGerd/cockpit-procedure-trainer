import { describe, expect, it } from 'vitest';
import { fixtureAircraft } from '../contract/fixtures';
import type { Aircraft, ControlChange, TrainerState } from '../contract';
import { observeControl, startChecklist } from '../checklist';
import { createControlStore } from '../controls';
import { defineDevice } from './define-device';
import {
  deviceControls,
  deviceEntryPositions,
  initialDeviceStates,
  stepDevices,
} from './device-runtime';
import { engineMonitor, fixtureDeviceAircraft, monitorState } from './fixtures';
import type { MonitorState } from './fixtures';

const devices = [engineMonitor];

const trainerState = (
  states: TrainerState<unknown>['devices'],
  controls: Record<string, string | number> = {},
  systems: Record<string, unknown> = {},
): TrainerState<unknown> => ({
  controls: { 'mon.page': 'engine', ...controls },
  systems: { busPowered: false, rpm: 0, volts: 0, ...systems },
  devices: states,
});

describe('defineDevice', () => {
  it('declares controls, a starting state and a pure step', () => {
    expect(Object.keys(engineMonitor.controls)).toEqual(['page']);
    expect(engineMonitor.initial).toEqual({ page: 'engine', reading: null });
    const input = { controls: { page: 'engine' }, powered: true, inputs: { rpm: 900 }, dtMs: 50 };
    const before = engineMonitor.initial;
    expect(engineMonitor.step(before, input)).toEqual({ page: 'engine', reading: 900 });
    expect(engineMonitor.step(before, input)).toEqual(engineMonitor.step(before, input));
    expect(before).toEqual({ page: 'engine', reading: null });
  });

  it('states the manual revision and what it does not model', () => {
    expect(engineMonitor.manual.en).not.toBe('');
    expect(engineMonitor.notModelled).toHaveLength(1);
  });
});

describe('defineDevice types', () => {
  it('rejects an initial position the control does not have', () => {
    const text = { de: 'a', en: 'a' } as const;
    const page = {
      kind: 'rotary',
      positions: ['engine', 'electrical'],
      initial: 'engine',
      name: text,
      description: text,
    } as const;
    defineDevice({
      id: 'x',
      manual: text,
      notModelled: [],
      controls: {
        // @ts-expect-error 'weather' is not a position of page
        page: { ...page, initial: 'weather' },
      },
      initial: {},
      step: (state) => state,
    });
  });
});

describe('deviceControls', () => {
  it('names each control <installId>.<controlId>', () => {
    const controls = deviceControls(fixtureDeviceAircraft, devices);
    expect(Object.keys(controls)).toEqual(['mon.page']);
    expect(controls['mon.page']).toBe(engineMonitor.controls.page);
  });

  it('is empty for an aircraft without devices', () => {
    expect(deviceControls(fixtureAircraft, devices)).toEqual({});
  });

  it('throws for an install whose device is not registered', () => {
    expect(() => deviceControls(fixtureDeviceAircraft, [])).toThrow(/engineMonitor/);
  });
});

describe('initialDeviceStates', () => {
  it('starts every install off in its starting state', () => {
    expect(initialDeviceStates(fixtureDeviceAircraft, devices)).toEqual({
      mon: { on: false, state: engineMonitor.initial },
    });
  });
});

describe('stepDevices', () => {
  const initial = initialDeviceStates(fixtureDeviceAircraft, devices);

  it('keeps a device without bus power off', () => {
    const next = stepDevices(
      fixtureDeviceAircraft,
      devices,
      trainerState(initial, {}, { rpm: 900 }),
      50,
    );
    expect(next.mon?.on).toBe(false);
    expect((next.mon?.state as MonitorState).reading).toBeNull();
  });

  it('turns a device on with bus power and feeds it the install inputs', () => {
    const state = trainerState(initial, {}, { busPowered: true, rpm: 900, volts: 12 });
    const next = stepDevices(fixtureDeviceAircraft, devices, state, 50);
    expect(next.mon).toEqual({ on: true, state: { page: 'engine', reading: 900 } });
    const electrical = trainerState(
      next,
      { 'mon.page': 'electrical' },
      { busPowered: true, rpm: 900, volts: 12 },
    );
    expect(stepDevices(fixtureDeviceAircraft, devices, electrical, 50).mon?.state).toEqual({
      page: 'electrical',
      reading: 12,
    });
  });

  it('switches off again when the bus loses power', () => {
    const live = trainerState(initial, {}, { busPowered: true, rpm: 900 });
    const on = stepDevices(fixtureDeviceAircraft, devices, live, 50);
    const dead = stepDevices(
      fixtureDeviceAircraft,
      devices,
      trainerState(on, {}, { rpm: 900 }),
      50,
    );
    expect(dead.mon?.on).toBe(false);
    expect((dead.mon?.state as MonitorState).reading).toBeNull();
  });

  it('starts from the device initial state when the trainer state has none yet', () => {
    const state = trainerState({}, {}, { busPowered: true, rpm: 700 });
    expect(stepDevices(fixtureDeviceAircraft, devices, state, 0).mon?.on).toBe(true);
  });

  it('reads only the controls of its own install', () => {
    const second = {
      ...fixtureDeviceAircraft,
      devices: {
        ...fixtureDeviceAircraft.devices,
        mon2: { ...fixtureDeviceAircraft.devices?.mon } as NonNullable<Aircraft['devices']>[string],
      },
    } as Aircraft;
    const state = trainerState(
      {},
      { 'mon.page': 'electrical', 'mon2.page': 'engine' },
      { busPowered: true, rpm: 800, volts: 12 },
    );
    const next = stepDevices(second, devices, state, 0);
    expect(next.mon?.state).toEqual({ page: 'electrical', reading: 12 });
    expect(next.mon2?.state).toEqual({ page: 'engine', reading: 800 });
  });

  it('does not mutate the state it was given', () => {
    const state = trainerState(initial, {}, { busPowered: true, rpm: 900 });
    const before = JSON.stringify(state);
    stepDevices(fixtureDeviceAircraft, devices, state, 50);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('throws for an install whose device is not registered', () => {
    expect(() => stepDevices(fixtureDeviceAircraft, [], trainerState({}), 0)).toThrow(
      /engineMonitor/,
    );
  });
});

describe('procedures over device controls', () => {
  it('lets an action target a device control and a check read device state', () => {
    const store = createControlStore({
      ...fixtureAircraft.controls,
      ...deviceControls(fixtureDeviceAircraft, devices),
    });
    const procedure = fixtureDeviceAircraft.procedures.monitorElectrical;
    if (!procedure) throw new Error('fixture procedure missing');

    let states = initialDeviceStates(fixtureDeviceAircraft, devices);
    const read = (): TrainerState<unknown> => ({
      controls: store.positions(),
      systems: { busPowered: true, rpm: 800, volts: 12 },
      devices: states,
    });
    states = stepDevices(fixtureDeviceAircraft, devices, read(), 0);

    let checklist = startChecklist(procedure, read(), {
      ...fixtureAircraft.controls,
      ...deviceControls(fixtureDeviceAircraft, devices),
    });
    expect(checklist.current).toBe(0);

    const changes: ControlChange[] = [];
    store.subscribe((change) => changes.push(change));
    store.set('mon.page', 'electrical');
    states = stepDevices(fixtureDeviceAircraft, devices, read(), 0);
    for (const change of changes) checklist = observeControl(checklist, change, read());

    expect(monitorState(read())?.page).toBe('electrical');
    expect(checklist.completed).toEqual([0]);
    expect(checklist.deviations).toEqual([]);
    expect(procedure.items[1]?.type === 'check' && procedure.items[1].condition(read())).toBe(true);
  });

  it('keeps a control that a loaded snapshot omits (store semantics only)', () => {
    const store = createControlStore({
      ...fixtureAircraft.controls,
      ...deviceControls(fixtureDeviceAircraft, devices),
    });
    store.set('mon.page', 'electrical');
    store.load(fixtureAircraft.phases.parking?.entry.controls ?? {});
    expect(store.positions()['mon.page']).toBe('electrical');
  });
});

describe('deviceEntryPositions', () => {
  const withEntry = (entryDevices: unknown): Aircraft => {
    const runup = fixtureDeviceAircraft.phases.runup;
    return {
      ...fixtureDeviceAircraft,
      phases: {
        ...fixtureDeviceAircraft.phases,
        runup: { ...runup, entry: { ...runup?.entry, devices: entryDevices } },
      },
    } as Aircraft;
  };

  it('gives every device control its declared initial position when the phase names none', () => {
    expect(deviceEntryPositions(fixtureDeviceAircraft, devices, 'parking')).toEqual({
      'mon.page': 'engine',
    });
  });

  it('uses the phase position where given', () => {
    const aircraft = withEntry({ mon: { page: 'electrical' } });
    expect(deviceEntryPositions(aircraft, devices, 'runup')).toEqual({ 'mon.page': 'electrical' });
    expect(deviceEntryPositions(aircraft, devices, 'parking')).toEqual({ 'mon.page': 'engine' });
  });

  it('is empty for an aircraft without devices', () => {
    expect(deviceEntryPositions(fixtureAircraft, devices, 'parking')).toEqual({});
  });

  it('throws for an unknown phase or an unregistered device', () => {
    expect(() => deviceEntryPositions(fixtureDeviceAircraft, devices, 'nowhere')).toThrow(
      /nowhere/,
    );
    expect(() => deviceEntryPositions(fixtureDeviceAircraft, [], 'parking')).toThrow(
      /engineMonitor/,
    );
  });
});

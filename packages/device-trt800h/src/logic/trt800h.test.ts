import { describe, expect, it } from 'vitest';
import {
  IDENT_MS,
  MODES,
  POWER_OFF_HOLD_MS,
  PRESSURE_ALTITUDE_INPUT,
  STORED_SHOW_MS,
  VFR_STORE_HOLD_MS,
  trt800hDevice,
} from './trt800h';
import type { Trt800hState } from './trt800h';

const KEYS = ['power', 'vfr', 'ident', 'mode', 'swap', 'cursor'] as const;

const resting: Record<string, string> = {
  ...Object.fromEntries(KEYS.map((key) => [key, 'released'])),
  knob: 'rest',
};

type Options = { powered?: boolean; dtMs?: number; altitude?: number | string };

const step = (
  state: Trt800hState,
  controls: Record<string, string> = {},
  { powered = true, dtMs = 0, altitude = 3000 }: Options = {},
) =>
  trt800hDevice.step(state, {
    controls: { ...resting, ...controls },
    powered,
    inputs: { [PRESSURE_ALTITUDE_INPUT]: altitude },
    dtMs,
  }) as Trt800hState;

const initial = trt800hDevice.initial as Trt800hState;

const tap = (state: Trt800hState, key: string, position = 'pressed', o?: Options) =>
  step(step(state, { [key]: position }, o), {}, o);

const hold = (state: Trt800hState, key: string, ms: number, o?: Options) =>
  step(step(step(state, { [key]: 'pressed' }, o), { [key]: 'pressed' }, { ...o, dtMs: ms }), {}, o);

const switchedOn = tap(initial, 'power');
const cursorAt = (state: Trt800hState, digit: number) =>
  Array.from({ length: digit + 1 }).reduce<Trt800hState>((s) => tap(s, 'cursor'), state);
const turn = (state: Trt800hState, position: 'up' | 'down', times = 1) =>
  Array.from({ length: times }).reduce<Trt800hState>((s) => tap(s, 'knob', position), state);

describe('trt800hDevice', () => {
  it('declares its controls', () => {
    expect(Object.keys(trt800hDevice.controls)).toEqual([...KEYS, 'knob']);
    for (const key of KEYS) expect(trt800hDevice.controls[key]?.kind).toBe('momentary');
    expect(trt800hDevice.controls.knob).toMatchObject({
      kind: 'rotary',
      positions: ['rest', 'down', 'up'],
      springBack: { down: 'rest', up: 'rest' },
    });
    expect(MODES).toEqual(['stby', 'acs', 'as']);
  });

  it('starts switched off in standby with the placeholder codes and the factory VFR code', () => {
    expect(initial).toMatchObject({
      on: false,
      mode: 'stby',
      squawk: '2000',
      standby: '2000',
      vfrCode: '7000',
      vfrShown: false,
      cursor: null,
      identMs: 0,
      flightLevel: null,
      reporting: false,
    });
  });

  describe('power', () => {
    it('stays off until I/O is pressed, whatever else is pressed', () => {
      let state = step(initial);
      for (const key of ['vfr', 'ident', 'mode', 'swap', 'cursor']) state = tap(state, key);
      state = tap(state, 'knob', 'up');
      expect(state).toMatchObject({ on: false, mode: 'stby', squawk: '2000', cursor: null });
    });

    it('switches on with any press of I/O, in standby', () => {
      expect(tap(initial, 'power')).toMatchObject({ on: true, mode: 'stby' });
    });

    it('does not switch off again when the press that switched on is kept down', () => {
      let state = step(initial, { power: 'pressed' });
      state = step(state, { power: 'pressed' }, { dtMs: POWER_OFF_HOLD_MS * 2 });
      expect(state.on).toBe(true);
    });

    it('switches off after the hold and not before', () => {
      expect(hold(switchedOn, 'power', POWER_OFF_HOLD_MS - 1).on).toBe(true);
      expect(hold(switchedOn, 'power', POWER_OFF_HOLD_MS).on).toBe(false);
    });

    it('sums the hold over several steps', () => {
      let state = step(switchedOn, { power: 'pressed' });
      for (let elapsed = 0; elapsed < POWER_OFF_HOLD_MS - 100; elapsed += 100) {
        state = step(state, { power: 'pressed' }, { dtMs: 100 });
        expect(state.on).toBe(true);
      }
      state = step(state, { power: 'pressed' }, { dtMs: 100 });
      expect(state.on).toBe(false);
    });

    it('does not switch on again while the key that switched off is still down', () => {
      let state = step(switchedOn, { power: 'pressed' });
      state = step(state, { power: 'pressed' }, { dtMs: POWER_OFF_HOLD_MS });
      expect(state.on).toBe(false);
      state = step(state, { power: 'pressed' }, { dtMs: 100 });
      expect(state.on).toBe(false);
      expect(tap(step(state), 'power').on).toBe(true);
    });

    it('a short press while on does nothing', () => {
      expect(tap(switchedOn, 'power', 'pressed', { dtMs: 100 }).on).toBe(true);
    });

    it('returns to standby and clears the transients when switched off, keeping the codes', () => {
      let state = tap(switchedOn, 'mode');
      state = tap(state, 'vfr');
      state = tap(state, 'ident');
      state = hold(state, 'power', POWER_OFF_HOLD_MS);
      expect(state).toMatchObject({
        on: false,
        mode: 'stby',
        cursor: null,
        identMs: 0,
        storedMs: 0,
        vfrShown: false,
        flightLevel: null,
        reporting: false,
        squawk: '7000',
        standby: '2000',
        vfrCode: '7000',
      });
    });

    it('switches off when power is lost and stays off when it returns', () => {
      const state = tap(tap(switchedOn, 'mode'), 'vfr');
      const lost = step(state, {}, { powered: false });
      expect(lost).toMatchObject({
        on: false,
        mode: 'stby',
        reporting: false,
        flightLevel: null,
        squawk: state.squawk,
        standby: state.standby,
      });
      expect(step(lost).on).toBe(false);
    });

    it('records the positions seen while unpowered so a key held at power-up does not fire', () => {
      const lost = step(initial, { power: 'pressed' }, { powered: false });
      expect(lost.held.power).toBe('pressed');
      expect(step(lost, { power: 'pressed' }).on).toBe(false);
    });

    it('ignores the controls while unpowered', () => {
      const state = step(switchedOn, { mode: 'pressed', swap: 'pressed' }, { powered: false });
      expect(state).toMatchObject({ on: false, mode: 'stby', squawk: switchedOn.squawk });
    });

    it('ignores every other key right after a hold switched the unit off', () => {
      const off = hold(switchedOn, 'power', POWER_OFF_HOLD_MS);
      expect(tap(off, 'mode')).toMatchObject({ on: false, mode: 'stby' });
    });
  });

  describe('mode', () => {
    it('steps standby, ACS, A-S and back to standby, one step per press', () => {
      let state = step(switchedOn, { mode: 'pressed' });
      state = step(state, { mode: 'pressed' });
      expect(state.mode).toBe('acs');
      state = step(state);
      expect(tap(state, 'mode').mode).toBe('as');
      expect(tap(tap(state, 'mode'), 'mode').mode).toBe('stby');
    });
  });

  describe('flight level and reporting', () => {
    it.each([
      [3000, 30],
      [3049, 30],
      [3050, 31],
      [0, 0],
      [-1000, -10],
      [35_000, 350],
    ])('takes FL from %i ft as %i', (altitude, level) => {
      expect(step(switchedOn, {}, { altitude }).flightLevel).toBe(level);
    });

    it.each([-1001, 35_001, Number.NaN, Number.POSITIVE_INFINITY, 'high'])(
      'shows FLerr for %s',
      (altitude) => {
        expect(step(switchedOn, {}, { altitude }).flightLevel).toBeNull();
      },
    );

    it('reads the flight level in standby too, but reports only in ACS with a valid level', () => {
      expect(step(switchedOn).flightLevel).toBe(30);
      expect(step(switchedOn).reporting).toBe(false);
      const acs = tap(switchedOn, 'mode');
      expect(step(acs).reporting).toBe(true);
      expect(step(acs, {}, { altitude: 40_000 }).reporting).toBe(false);
      expect(step(tap(acs, 'mode')).reporting).toBe(false);
    });

    it('reads the level on the step that switches the unit on', () => {
      const first = step(initial, { power: 'pressed' });
      expect(first).toMatchObject({ on: true, flightLevel: 30, reporting: false });
      expect(step(initial, { power: 'pressed' }, { altitude: 40_000 }).flightLevel).toBeNull();
    });

    it('reads no level while switched off', () => {
      expect(step(initial).flightLevel).toBeNull();
    });
  });

  describe('ident', () => {
    it('does nothing in standby', () => {
      expect(tap(switchedOn, 'ident').identMs).toBe(0);
    });

    it.each(['acs', 'as'])('runs IDENT_MS in %s and counts down', (mode) => {
      let state = tap(switchedOn, 'mode');
      if (mode === 'as') state = tap(state, 'mode');
      state = tap(state, 'ident');
      expect(state.identMs).toBe(IDENT_MS);
      state = step(state, {}, { dtMs: 1000 });
      expect(state.identMs).toBe(IDENT_MS - 1000);
      state = step(state, {}, { dtMs: IDENT_MS });
      expect(state.identMs).toBe(0);
    });

    it('ends when the unit returns to standby', () => {
      let state = tap(tap(switchedOn, 'mode'), 'ident');
      state = tap(tap(state, 'mode'), 'mode');
      expect(state.mode).toBe('stby');
      expect(state.identMs).toBe(0);
    });

    it('counts one ident per press', () => {
      let state = tap(switchedOn, 'mode');
      state = step(state, { ident: 'pressed' });
      state = step(state, { ident: 'pressed' }, { dtMs: 5000 });
      state = step(state, { ident: 'pressed' }, { dtMs: 1000 });
      expect(state.identMs).toBe(IDENT_MS - 6000);
    });
  });

  describe('code entry', () => {
    it('puts the cursor on the first digit, then moves it on, then removes it after the fourth', () => {
      let state = tap(switchedOn, 'cursor');
      expect(state.cursor).toBe(0);
      state = tap(state, 'cursor');
      expect(state.cursor).toBe(1);
      state = tap(tap(state, 'cursor'), 'cursor');
      expect(state.cursor).toBe(3);
      expect(tap(state, 'cursor').cursor).toBeNull();
    });

    it('counts one cursor step per press, not per step', () => {
      let state = step(switchedOn, { cursor: 'pressed' });
      state = step(state, { cursor: 'pressed' });
      expect(state.cursor).toBe(0);
    });

    it('turns the digit under the cursor of the standby code, wrapping within 0 to 7', () => {
      const state = turn(cursorAt(switchedOn, 0), 'up');
      expect(state.standby).toBe('3000');
      expect(turn(state, 'up', 5).standby).toBe('0000');
      expect(turn(state, 'down', 4).standby).toBe('7000');
      expect(state.squawk).toBe('2000');
    });

    it('turns the digit at each cursor place', () => {
      expect(turn(cursorAt(switchedOn, 3), 'up').standby).toBe('2001');
      expect(turn(cursorAt(switchedOn, 1), 'down').standby).toBe('2700');
    });

    it('counts one turn per knob movement and ignores the return to rest', () => {
      let state = cursorAt(switchedOn, 0);
      state = step(state, { knob: 'up' });
      state = step(state, { knob: 'up' });
      state = step(state);
      expect(state.standby).toBe('3000');
    });

    it('does nothing with the knob when no cursor is shown', () => {
      expect(turn(switchedOn, 'up').standby).toBe('2000');
    });

    it('moves the cursor back with the swap key and removes it from the first digit', () => {
      let state = tap(cursorAt(switchedOn, 2), 'swap');
      expect(state.cursor).toBe(1);
      expect(state.squawk).toBe('2000');
      state = tap(tap(state, 'swap'), 'swap');
      expect(state.cursor).toBeNull();
    });

    it('exchanges the codes with the swap key when no cursor is shown', () => {
      let state = turn(cursorAt(switchedOn, 0), 'up');
      state = tap(tap(state, 'cursor'), 'cursor');
      state = tap(tap(state, 'cursor'), 'cursor');
      expect(state.cursor).toBeNull();
      state = tap(state, 'swap');
      expect(state).toMatchObject({ squawk: '3000', standby: '2000' });
    });
  });

  describe('VFR', () => {
    it('makes the VFR code active, moves the old active code to standby and shows VFR', () => {
      const state = tap({ ...switchedOn, squawk: '4321' }, 'vfr');
      expect(state).toMatchObject({
        squawk: '7000',
        standby: '4321',
        vfrShown: true,
        vfrCode: '7000',
      });
    });

    it('shows the standby code again on a second press, keeping VFR active', () => {
      const state = tap(tap(switchedOn, 'vfr'), 'vfr');
      expect(state).toMatchObject({ squawk: '7000', standby: '2000', vfrShown: false });
    });

    it('shows the standby code again on swap while VFR is shown, without exchanging', () => {
      const state = tap(tap(switchedOn, 'vfr'), 'swap');
      expect(state).toMatchObject({ squawk: '7000', standby: '2000', vfrShown: false });
    });

    it('shows the standby code again on a knob turn with no cursor, changing no digit', () => {
      const state = turn(tap(switchedOn, 'vfr'), 'up');
      expect(state).toMatchObject({ vfrShown: false, standby: '2000' });
    });

    it('shows the standby code when the cursor is put on it', () => {
      const state = tap(tap(switchedOn, 'vfr'), 'cursor');
      expect(state).toMatchObject({ vfrShown: false, cursor: 0 });
    });

    it('does not lose the standby code when the active code is already the VFR code', () => {
      const state = tap({ ...switchedOn, squawk: '7000', standby: '1234' }, 'vfr');
      expect(state).toMatchObject({ squawk: '7000', standby: '1234', vfrShown: true });
    });

    it('stores the active code as the VFR code after the hold, and shows S, then VFR', () => {
      const typed: Trt800hState = { ...switchedOn, squawk: '1200' };
      let state = step(typed, { vfr: 'pressed' });
      expect(state.vfrCode).toBe('7000');
      state = step(state, { vfr: 'pressed' }, { dtMs: VFR_STORE_HOLD_MS });
      expect(state).toMatchObject({ vfrCode: '1200', vfrShown: true, storedMs: STORED_SHOW_MS });
      state = step(state, {}, { dtMs: STORED_SHOW_MS });
      expect(state).toMatchObject({ storedMs: 0, vfrShown: true, squawk: '1200', standby: '2000' });
    });

    it('does not activate the VFR code on the release that ends a store hold', () => {
      const state = hold({ ...switchedOn, squawk: '1200' }, 'vfr', VFR_STORE_HOLD_MS);
      expect(state).toMatchObject({ squawk: '1200', standby: '2000', vfrCode: '1200' });
    });

    it('stores once however long the key stays down', () => {
      let state = step({ ...switchedOn, squawk: '1200' }, { vfr: 'pressed' });
      state = step(state, { vfr: 'pressed' }, { dtMs: VFR_STORE_HOLD_MS });
      state = step(state, { vfr: 'pressed' }, { dtMs: STORED_SHOW_MS });
      expect(state.storedMs).toBe(0);
      state = step(state, { vfr: 'pressed' }, { dtMs: VFR_STORE_HOLD_MS });
      expect(state.storedMs).toBe(0);
    });

    it('activates the VFR code on release when the hold was shorter than the store threshold', () => {
      const state = hold(switchedOn, 'vfr', VFR_STORE_HOLD_MS - 1);
      expect(state).toMatchObject({ squawk: '7000', vfrCode: '7000', vfrShown: true });
    });

    it('removes the cursor on a VFR short release', () => {
      const state = tap(cursorAt(switchedOn, 1), 'vfr');
      expect(state).toMatchObject({ cursor: null, vfrShown: true });
    });

    it('removes the cursor when the store hold completes', () => {
      let state = step(cursorAt({ ...switchedOn, squawk: '1200' }, 1), { vfr: 'pressed' });
      expect(state.cursor).toBe(1);
      state = step(state, { vfr: 'pressed' }, { dtMs: VFR_STORE_HOLD_MS });
      expect(state).toMatchObject({ cursor: null, vfrCode: '1200' });
    });

    it('keeps the stored VFR code across power loss and a new power-on', () => {
      let state = hold({ ...switchedOn, squawk: '1200' }, 'vfr', VFR_STORE_HOLD_MS);
      state = step(state, {}, { powered: false });
      expect(state.vfrCode).toBe('1200');
      state = tap(tap(state, 'power'), 'vfr');
      expect(state.squawk).toBe('1200');
    });

    it('does nothing while off', () => {
      expect(tap(initial, 'vfr')).toMatchObject({ squawk: '2000', vfrShown: false });
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  DIGIT_KEYS,
  IDENT_DURATION_MS,
  MODES,
  PRESSURE_ALTITUDE_INPUT,
  VFR_CODE,
  gtx327Device,
} from './gtx327';
import type { Gtx327State } from './gtx327';

const KEYS = [...DIGIT_KEYS, 'clr', 'crsr', 'vfr', 'ident', 'func', 'startStop'];

const released: Record<string, string> = {
  mode: 'sby',
  ...Object.fromEntries(KEYS.map((key) => [key, 'released'])),
};

type Options = { powered?: boolean; dtMs?: number; altitude?: number };

const step = (
  state: Gtx327State,
  controls: Record<string, string> = {},
  { powered = true, dtMs = 0, altitude }: Options = {},
) =>
  gtx327Device.step(state, {
    controls: { ...released, ...controls },
    powered,
    inputs: altitude === undefined ? {} : { [PRESSURE_ALTITUDE_INPUT]: altitude },
    dtMs,
  }) as Gtx327State;

const start = gtx327Device.initial as Gtx327State;

/** One press: a step with the key down, then one with it up. */
const tap = (state: Gtx327State, key: string, controls: Record<string, string> = {}, o?: Options) =>
  step(step(state, { ...controls, [key]: 'pressed' }, o), controls, o);

const typeCode = (state: Gtx327State, code: string, mode = 'sby') =>
  [...code].reduce((next, digit) => tap(next, `key${digit}`, { mode }), state);

describe('gtx327Device', () => {
  it('declares its controls', () => {
    expect(Object.keys(gtx327Device.controls)).toEqual(['mode', ...KEYS]);
    expect(gtx327Device.controls.mode).toMatchObject({
      kind: 'rotary',
      positions: ['off', 'sby', 'tst', 'gnd', 'on', 'alt'],
    });
    expect(MODES).toEqual(['off', 'sby', 'tst', 'gnd', 'on', 'alt']);
    for (const key of KEYS) expect(gtx327Device.controls[key]?.kind).toBe('momentary');
  });

  it('offers the digits 0 to 7 only', () => {
    expect(DIGIT_KEYS).toEqual(['key0', 'key1', 'key2', 'key3', 'key4', 'key5', 'key6', 'key7']);
  });

  it('follows the mode knob', () => {
    for (const mode of MODES) expect(step(start, { mode }).mode).toBe(mode);
  });

  describe('code entry', () => {
    it('shows the digits as they are typed and commits at the fourth', () => {
      let state = typeCode(start, '12');
      expect(state).toMatchObject({ entry: '12', squawk: start.squawk });
      state = typeCode(state, '3');
      expect(state).toMatchObject({ entry: '123', squawk: start.squawk });
      state = typeCode(state, '4');
      expect(state).toMatchObject({ entry: '', squawk: '1234' });
    });

    it('counts one digit per press, not per step', () => {
      let state = step(start, { key5: 'pressed' });
      state = step(state, { key5: 'pressed' });
      state = step(state, { key5: 'pressed' });
      expect(state.entry).toBe('5');
    });

    it('CLR removes the last typed digit', () => {
      const state = tap(typeCode(start, '123'), 'clr');
      expect(state.entry).toBe('12');
      expect(tap(tap(tap(state, 'clr'), 'clr'), 'clr').entry).toBe('');
    });

    it('CRSR cancels the entry and keeps the old code', () => {
      const state = tap(typeCode(start, '123'), 'crsr');
      expect(state).toMatchObject({ entry: '', squawk: start.squawk });
    });

    it('takes digits in standby, ground, on and altitude only', () => {
      for (const mode of ['sby', 'gnd', 'on', 'alt']) {
        expect(typeCode(start, '4', mode).entry).toBe('4');
      }
      for (const mode of ['off', 'tst']) expect(typeCode(start, '4', mode).entry).toBe('');
    });

    it('ignores keys while the unit is unpowered', () => {
      expect(tap(start, 'key3', {}, { powered: false }).entry).toBe('');
    });

    it('drops a half-typed code when the mode goes off or to test', () => {
      const typed = typeCode(start, '12');
      expect(step(typed, { mode: 'off' }).entry).toBe('');
      expect(step(typed, { mode: 'tst' }).entry).toBe('');
    });

    it('keeps the code through a power cycle', () => {
      const coded = typeCode(start, '4321');
      const off = step(coded, {}, { powered: false });
      expect(step(off, {}).squawk).toBe('4321');
    });
  });

  describe('VFR key', () => {
    it('sets the VFR code and clears a half-typed entry', () => {
      const state = tap(typeCode(start, '12'), 'vfr');
      expect(state).toMatchObject({ squawk: VFR_CODE, entry: '' });
      expect(VFR_CODE).toBe('7000');
      expect(start.squawk).not.toBe(VFR_CODE);
    });

    it('does nothing in off and test', () => {
      expect(tap(start, 'vfr', { mode: 'off' }).squawk).toBe(start.squawk);
      expect(tap(start, 'vfr', { mode: 'tst' }).squawk).toBe(start.squawk);
    });
  });

  describe('IDENT', () => {
    it('starts the reply flag in on and altitude only', () => {
      for (const mode of ['on', 'alt']) {
        expect(tap(start, 'ident', { mode })).toMatchObject({
          ident: true,
          identRemainingMs: IDENT_DURATION_MS,
        });
      }
      for (const mode of ['off', 'sby', 'tst', 'gnd']) {
        expect(tap(start, 'ident', { mode }).ident).toBe(false);
      }
    });

    it('runs down on the clock and clears', () => {
      let state = tap(start, 'ident', { mode: 'alt' });
      state = step(state, { mode: 'alt' }, { dtMs: IDENT_DURATION_MS - 1 });
      expect(state.ident).toBe(true);
      state = step(state, { mode: 'alt' }, { dtMs: 1 });
      expect(state).toMatchObject({ ident: false, identRemainingMs: 0 });
    });

    it('is cut off by leaving the replying modes or losing power', () => {
      const running = tap(start, 'ident', { mode: 'alt' });
      expect(step(running, { mode: 'sby' }).ident).toBe(false);
      expect(step(running, { mode: 'alt' }, { powered: false }).ident).toBe(false);
    });
  });

  describe('pressure altitude', () => {
    it('reads the input outside off and test and reports it in altitude mode only', () => {
      expect(step(start, { mode: 'sby' }, { altitude: 4500 })).toMatchObject({
        altitude: 4500,
        reporting: false,
      });
      expect(step(start, { mode: 'alt' }, { altitude: 4500 })).toMatchObject({
        altitude: 4500,
        reporting: true,
      });
    });

    it('has no altitude when off, in test, unpowered or without a finite input', () => {
      expect(step(start, { mode: 'off' }, { altitude: 4500 }).altitude).toBeNull();
      expect(step(start, { mode: 'tst' }, { altitude: 4500 }).altitude).toBeNull();
      expect(step(start, { mode: 'alt' }, { altitude: 4500, powered: false }).altitude).toBeNull();
      expect(step(start, { mode: 'alt' }).altitude).toBeNull();
      expect(step(start, { mode: 'alt' }, { altitude: Number.NaN }).altitude).toBeNull();
    });
  });

  describe('function pages and the count-up timer', () => {
    it('FUNC cycles the pages and wraps', () => {
      expect(start.page).toBe('altitude');
      const second = tap(start, 'func');
      expect(second.page).toBe('countUp');
      expect(tap(second, 'func').page).toBe('altitude');
    });

    it('START/STOP runs and stops the timer only on its page', () => {
      expect(tap(start, 'startStop').timerRunning).toBe(false);
      let state = tap(start, 'func');
      state = tap(state, 'startStop');
      expect(state.timerRunning).toBe(true);
      state = step(state, {}, { dtMs: 3000 });
      expect(state.timerMs).toBe(3000);
      state = tap(state, 'startStop');
      expect(state.timerRunning).toBe(false);
      expect(step(state, {}, { dtMs: 3000 }).timerMs).toBe(3000);
    });

    it('CLR resets a stopped timer on its page, never a running one', () => {
      let state = tap(tap(start, 'func'), 'startStop');
      state = step(state, {}, { dtMs: 3000 });
      expect(tap(state, 'clr').timerMs).toBe(3000);
      state = tap(state, 'startStop');
      expect(tap(state, 'clr').timerMs).toBe(0);
    });

    it('stops the timer when power is lost', () => {
      let state = tap(tap(start, 'func'), 'startStop');
      state = step(state, {}, { dtMs: 1000 });
      state = step(state, {}, { powered: false, dtMs: 1000 });
      expect(state).toMatchObject({ timerRunning: false, timerMs: 1000 });
    });
  });

  describe('in OFF', () => {
    it('ignores every key and resets the timer', () => {
      let running = tap(tap(start, 'func'), 'startStop');
      running = step(running, {}, { dtMs: 2000 });
      const off = step(running, { mode: 'off', func: 'pressed', startStop: 'pressed' });
      expect(off).toMatchObject({ page: 'countUp', timerRunning: false, timerMs: 0 });
      const after = step(off, { mode: 'off', clr: 'pressed' }, { dtMs: 5000 });
      expect(after).toMatchObject({ page: 'countUp', timerRunning: false, timerMs: 0 });
      expect(tap(start, 'func', { mode: 'off' }).page).toBe('altitude');
      expect(tap(tap(start, 'func'), 'startStop', { mode: 'off' }).timerRunning).toBe(false);
    });
  });

  it('records the keys it saw so a held key counts once', () => {
    expect(step(start, { vfr: 'pressed' }).held.vfr).toBe('pressed');
    expect(step(start, {}, { powered: false }).held.vfr).toBe('released');
  });
});

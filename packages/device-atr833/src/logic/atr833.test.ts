import { describe, expect, it } from 'vitest';
import {
  CHANNEL_NAMES,
  DUAL_WATCH_MIN_SQL,
  ITEMS,
  LONG_PRESS_MS,
  MEMORY_SLOTS,
  MENU_TIMEOUT_MS,
  POWER_OFF_HOLD_MS,
  atr833Device,
  formatFrequency,
  lineThree,
  listEntry,
} from './atr833';
import type { Atr833State } from './atr833';

const KEYS = ['power', 'set', 'mem', 'dw', 'swap', 'cursor'];
const KNOBS = ['volSel', 'freq'];

const resting: Record<string, string> = {
  ...Object.fromEntries(KEYS.map((key) => [key, 'released'])),
  ...Object.fromEntries(KNOBS.map((knob) => [knob, 'rest'])),
};

type Options = { powered?: boolean; dtMs?: number };

const step = (
  state: Atr833State,
  controls: Record<string, string> = {},
  { powered = true, dtMs = 0 }: Options = {},
) =>
  atr833Device.step(state, {
    controls: { ...resting, ...controls },
    powered,
    inputs: {},
    dtMs,
  }) as Atr833State;

const start = atr833Device.initial as Atr833State;
const tap = (state: Atr833State, key: string) => step(step(state, { [key]: 'pressed' }), {});
const running = tap(step(start), 'power');
const turn = (state: Atr833State, knob: 'volSel' | 'freq', direction: 'up' | 'down', times = 1) => {
  let next = state;
  for (let count = 0; count < times; count++) {
    next = step(step(next, { [knob]: direction }), {});
  }
  return next;
};
const hold = (state: Atr833State, key: string, ms: number, slice = 100) => {
  let next = step(state, { [key]: 'pressed' });
  for (let elapsed = 0; elapsed < ms; elapsed += slice) {
    next = step(next, { [key]: 'pressed' }, { dtMs: slice });
  }
  return next;
};
const release = (state: Atr833State) => step(state, {});
const wait = (state: Atr833State, ms: number) => step(state, {}, { dtMs: ms });
const pull = (state: Atr833State) => step(state, {}, { powered: false });

const withMemory = (entries: Record<number, number>): Atr833State => {
  const memory = [...running.memory];
  for (const [slot, khz] of Object.entries(entries)) memory[Number(slot)] = khz;
  return { ...running, memory };
};

describe('atr833Device', () => {
  it('declares its controls', () => {
    expect(Object.keys(atr833Device.controls).sort()).toEqual([...KEYS, ...KNOBS].sort());
    for (const key of KEYS) expect(atr833Device.controls[key]?.kind).toBe('momentary');
    for (const knob of KNOBS) {
      expect(atr833Device.controls[knob]).toMatchObject({
        kind: 'rotary',
        positions: ['rest', 'down', 'up'],
        springBack: { down: 'rest', up: 'rest' },
      });
    }
  });

  it('starts dark on 118.000 and 119.000 with the A manual squelch of 05', () => {
    expect(start).toMatchObject({ on: false, powered: false, active: 118000, standby: 119000 });
    expect(start).toMatchObject({ cursor: 'mhz', dualWatch: false, item: 'vol', list: null });
    expect(start.settings).toEqual({ vol: 10, sql: 5, dim: 10, vox: 5, dwm: 0, int: 5, ext: 0 });
    expect(start.memory).toHaveLength(100);
    expect(MEMORY_SLOTS).toBe(100);
    expect(start.memory.every((slot) => slot === null)).toBe(true);
    expect(start.recent).toEqual([]);
    expect(start.lastFromMemory).toBeNull();
  });

  it('names no channel outside the 16 names of a 100 kHz block', () => {
    expect(CHANNEL_NAMES).toEqual([0, 5, 10, 15, 25, 30, 35, 40, 50, 55, 60, 65, 75, 80, 85, 90]);
    expect(formatFrequency(132055)).toBe('132.055');
  });
});

describe('power', () => {
  it('stays off when power arrives: the unit has no switch-on at supply', () => {
    const arrived = step(start, {});
    expect(arrived).toMatchObject({ on: false, powered: true, active: 118000, standby: 119000 });
    expect(step(arrived, {}, { dtMs: 5000 }).on).toBe(false);
  });

  it('is switched on by an I/O press once powered, on the MHz field', () => {
    expect(running).toMatchObject({ on: true, powered: true, cursor: 'mhz' });
    expect(running).toMatchObject({ active: 118000, standby: 119000 });
  });

  it('switches off after an I/O hold of about 2 s', () => {
    expect(POWER_OFF_HOLD_MS).toBe(2000);
    expect(release(hold(running, 'power', POWER_OFF_HOLD_MS - 500)).on).toBe(true);
    const state = hold(running, 'power', POWER_OFF_HOLD_MS);
    expect(state).toMatchObject({ on: false, powered: true, active: 118000, standby: 119000 });
  });

  it('runs a breaker pull and push-back: dark, still dark, then on with I/O as before', () => {
    let tuned = tap(turn(running, 'freq', 'up'), 'swap');
    tuned = turn(tap(tuned, 'set'), 'volSel', 'up', 2);
    tuned = tap(hold(tap(tuned, 'mem'), 'mem', LONG_PRESS_MS), 'dw');
    tuned = tap(tuned, 'dw');
    expect(tuned).toMatchObject({ dualWatch: true, item: 'sql' });
    expect(tuned.memory[0]).toBe(120000);

    const pulled = pull(tuned);
    expect(pulled).toMatchObject({ on: false, powered: false, dualWatch: false, list: null });
    expect(pulled.item).toBe('vol');

    const pushedBack = step(pulled, {});
    expect(pushedBack).toMatchObject({ on: false, powered: true });
    expect(step(pushedBack, {}, { dtMs: 10_000 }).on).toBe(false);
    expect(turn(pushedBack, 'freq', 'up').standby).toBe(tuned.standby);

    const back = tap(pushedBack, 'power');
    expect(back).toMatchObject({ on: true, cursor: 'mhz', dualWatch: false, item: 'vol' });
    expect(back).toMatchObject({ active: tuned.active, standby: tuned.standby });
    expect(back.settings).toEqual(tuned.settings);
    expect(back.memory).toEqual(tuned.memory);
    expect(back.recent).toEqual(tuned.recent);
    expect(back.lastFromMemory).toBe(tuned.lastFromMemory);
  });

  it('ignores the keys while unpowered but records their positions', () => {
    const lost = step(running, { swap: 'pressed' }, { powered: false });
    expect(lost.active).toBe(118000);
    expect(lost.held.swap).toBe('pressed');
    expect(lost.heldMs).toEqual({ power: 0, set: 0, mem: 0 });
  });

  it('does not fire a key that is held while power arrives', () => {
    const held = step(start, { swap: 'pressed' }, { powered: false });
    expect(step(held, { swap: 'pressed' })).toMatchObject({ on: false, active: 118000 });
    const io = step(start, { power: 'pressed' }, { powered: false });
    expect(step(io, { power: 'pressed' }).on).toBe(false);
  });

  it('does not act on a SET or MEM release of a key pressed before the unit was on', () => {
    const held = step(start, { set: 'pressed', mem: 'pressed' }, { powered: false });
    const arrived = step(held, { set: 'pressed', mem: 'pressed' });
    expect(release(arrived)).toMatchObject({ item: 'vol', list: null });
  });

  it('does not act on a SET or MEM key held while the power goes', () => {
    const lost = step(step(running, { mem: 'pressed' }), { mem: 'pressed' }, { powered: false });
    expect(lost.heldMs.mem).toBe(-1);
  });

  it('switches on for an I/O hold past the off time from a unit that has never been on', () => {
    expect(hold(step(start), 'power', POWER_OFF_HOLD_MS + 1000).on).toBe(true);
  });

  it('does not switch off again for the press that switched it on', () => {
    const off = release(hold(running, 'power', POWER_OFF_HOLD_MS));
    expect(hold(off, 'power', POWER_OFF_HOLD_MS + 1000).on).toBe(true);
  });

  it('keeps holding after the off time without switching on again', () => {
    expect(hold(running, 'power', POWER_OFF_HOLD_MS + 2000).on).toBe(false);
  });

  it('clears dual watch, line 3 and a list when held off', () => {
    const state = hold(tap(tap(running, 'dw'), 'set'), 'power', POWER_OFF_HOLD_MS);
    expect(state).toMatchObject({ dualWatch: false, item: 'vol', list: null });
  });

  it('ignores every other key while off', () => {
    const off = release(hold(running, 'power', POWER_OFF_HOLD_MS));
    expect(tap(off, 'swap')).toMatchObject({ active: 118000, standby: 119000 });
    expect(turn(off, 'freq', 'up').standby).toBe(119000);
  });
});

describe('frequency entry', () => {
  it('steps the MHz field from power-on, wrapping without a carry', () => {
    expect(turn(running, 'freq', 'up').standby).toBe(120000);
    expect(turn(running, 'freq', 'down').standby).toBe(118000);
    expect(turn({ ...running, standby: 136000 }, 'freq', 'up').standby).toBe(118000);
    expect(turn({ ...running, standby: 118000 }, 'freq', 'down').standby).toBe(136000);
  });

  it('moves the cursor to the 100 kHz digit, the channel digits and back to MHz', () => {
    const tenths = tap(running, 'cursor');
    expect(tenths.cursor).toBe('tenths');
    expect(turn(tenths, 'freq', 'up').standby).toBe(119100);
    const channel = tap(tenths, 'cursor');
    expect(channel.cursor).toBe('channel');
    expect(tap(channel, 'cursor').cursor).toBe('mhz');
  });

  it('wraps the 100 kHz digit without a carry', () => {
    const state = tap({ ...running, standby: 119900 }, 'cursor');
    expect(turn(state, 'freq', 'up').standby).toBe(119000);
    expect(turn({ ...state, standby: 119000 }, 'freq', 'down').standby).toBe(119900);
  });

  it('steps through the 16 channel names of a block and wraps', () => {
    const channel = tap(tap(running, 'cursor'), 'cursor');
    const seen = [channel];
    for (let index = 0; index < CHANNEL_NAMES.length; index++) {
      seen.push(turn(seen[index] as Atr833State, 'freq', 'up'));
    }
    expect(seen.map((state) => state.standby % 100).slice(0, 6)).toEqual([0, 5, 10, 15, 25, 30]);
    expect(seen[16]?.standby).toBe(119000);
    expect(turn({ ...channel, standby: 119090 }, 'freq', 'up').standby).toBe(119000);
    expect(turn(channel, 'freq', 'down').standby).toBe(119090);
  });

  it('never leaves 118.000 to 136.990', () => {
    let state = { ...tap(tap(running, 'cursor'), 'cursor'), standby: 136990 };
    state = turn(state, 'freq', 'up', 3);
    expect(state.standby).toBeLessThanOrEqual(136990);
    expect(state.standby).toBeGreaterThanOrEqual(118000);
    const wide = { ...tap(running, 'cursor'), standby: 136900 };
    expect(turn(wide, 'freq', 'down').standby).toBe(136800);
    expect(turn({ ...wide, standby: 136000 }, 'freq', 'down').standby).toBe(136900);
  });

  it('counts a held knob once', () => {
    const first = step(running, { freq: 'up' });
    expect(step(first, { freq: 'up' }, { dtMs: 500 }).standby).toBe(120000);
  });

  it('counts a change from one turn direction to the other', () => {
    const up = step(running, { freq: 'up' });
    expect(step(up, { freq: 'down' }).standby).toBe(119000);
  });
});

describe('swap and dual watch', () => {
  it('exchanges the active and standby frequencies', () => {
    expect(tap(turn(running, 'freq', 'up'), 'swap')).toMatchObject({
      active: 120000,
      standby: 118000,
    });
  });

  it('adds a frequency that becomes active to the last-used list, newest first without repeats', () => {
    let state = tap(turn(running, 'freq', 'up'), 'swap');
    expect(state.recent).toEqual([120000]);
    state = tap(tap(state, 'swap'), 'swap');
    expect(state.recent).toEqual([120000, 118000]);
  });

  it('keeps at most ten last-used frequencies', () => {
    let state = running;
    for (let count = 0; count < 12; count++) {
      state = tap({ ...state, standby: 119000 + count * 1000 }, 'swap');
    }
    expect(state.recent).toHaveLength(10);
    expect(state.recent[0]).toBe(state.active);
  });

  it('toggles dual watch and ends it when either frequency changes', () => {
    const watching = tap(running, 'dw');
    expect(watching.dualWatch).toBe(true);
    expect(tap(watching, 'dw').dualWatch).toBe(false);
    expect(turn(watching, 'freq', 'up').dualWatch).toBe(false);
    expect(tap(watching, 'swap').dualWatch).toBe(false);
  });

  it('needs a squelch of at least 02 for dual watch', () => {
    expect(DUAL_WATCH_MIN_SQL).toBe(2);
    const low = { ...running, settings: { ...running.settings, sql: 1 } };
    expect(tap(low, 'dw').dualWatch).toBe(false);
    const enough = { ...running, settings: { ...running.settings, sql: 2 } };
    expect(tap(enough, 'dw').dualWatch).toBe(true);
  });

  it('toggles dual watch while line 3 shows another item, keeping that item', () => {
    expect(tap(tap(running, 'set'), 'dw')).toMatchObject({ item: 'sql', dualWatch: true });
  });
});

describe('line-3 items and the VOL/SEL knob', () => {
  it('steps the volume on the standard display', () => {
    expect(turn(running, 'volSel', 'up').settings.vol).toBe(11);
    expect(turn(running, 'volSel', 'down', 2).settings.vol).toBe(8);
  });

  it('steps line 3 through VOL, SQL, DIM, VOX, DWM, INT, EXT and back to VOL', () => {
    expect(ITEMS).toEqual(['vol', 'sql', 'dim', 'vox', 'dwm', 'int', 'ext']);
    const items: string[] = [];
    let state = running;
    for (let count = 0; count < 8; count++) {
      items.push(state.item);
      state = tap(state, 'set');
    }
    expect(items).toEqual(['vol', 'sql', 'dim', 'vox', 'dwm', 'int', 'ext', 'vol']);
  });

  it.each([
    ['vol', 0, 1, 16],
    ['sql', 1, 1, 10],
    ['dim', 2, 1, 10],
    ['vox', 3, 1, 10],
    ['dwm', 4, -8, 0],
    ['int', 5, 1, 10],
    ['ext', 6, 0, 10],
  ] as const)('keeps %s within its range', (item, presses, min, max) => {
    let state = running;
    for (let count = 0; count < presses; count++) state = tap(state, 'set');
    expect(state.item).toBe(item);
    expect(turn(state, 'volSel', 'down', 30).settings[item]).toBe(min);
    expect(turn(state, 'volSel', 'up', 30).settings[item]).toBe(max);
  });

  it('prints line 3 as the item and a two-digit value', () => {
    expect(lineThree(running)).toBe('VOL 10');
    expect(lineThree(tap(running, 'set'))).toBe('SQL 05');
    const dwm = { ...running, item: 'dwm' as const };
    expect(lineThree(dwm)).toBe('DWM 00');
    expect(lineThree({ ...dwm, settings: { ...dwm.settings, dwm: -2 } })).toBe('DWM -2');
    expect(lineThree({ ...running, item: 'ext' })).toBe('EXT 00');
  });

  it('acts on the release of SET, not its press', () => {
    const pressed = step(running, { set: 'pressed' });
    expect(pressed.item).toBe('vol');
    expect(release(pressed).item).toBe('sql');
  });

  it('goes back to VOL on a SET hold, and the release that ends it does nothing more', () => {
    const dim = tap(tap(running, 'set'), 'set');
    expect(release(hold(dim, 'set', LONG_PRESS_MS - 500)).item).toBe('vox');
    const held = hold(dim, 'set', LONG_PRESS_MS);
    expect(held.item).toBe('vol');
    expect(release(held).item).toBe('vol');
    expect(release(hold(dim, 'set', 6000)).item).toBe('vol');
  });

  it('returns to VOL after the 12 s time-out without input', () => {
    expect(MENU_TIMEOUT_MS).toBe(12_000);
    const state = tap(running, 'set');
    expect(wait(state, MENU_TIMEOUT_MS - 1).item).toBe('sql');
    expect(wait(state, MENU_TIMEOUT_MS).item).toBe('vol');
  });

  it('restarts the time-out on every input', () => {
    let state = wait(tap(running, 'set'), MENU_TIMEOUT_MS - 1000);
    state = turn(state, 'volSel', 'up');
    expect(wait(state, MENU_TIMEOUT_MS - 1).item).toBe('sql');
  });
});

describe('the user memory list', () => {
  it('opens at MEM 00 on a short MEM release and puts the entry in standby at once', () => {
    const state = tap(withMemory({ 0: 122000 }), 'mem');
    expect(state.list).toEqual({ kind: 'mem', index: 0 });
    expect(lineThree(state)).toBe('MEM 00');
    expect(state).toMatchObject({ standby: 122000, active: 118000 });
    expect(listEntry(state)).toBe(122000);
  });

  it('acts on the release of MEM, not its press', () => {
    const pressed = step(running, { mem: 'pressed' });
    expect(pressed.list).toBeNull();
    expect(release(pressed).list).toEqual({ kind: 'mem', index: 0 });
  });

  it('browses 100 entries with the knob, wrapping, each one replacing the standby frequency', () => {
    const open = tap(withMemory({ 1: 123450, 99: 130000 }), 'mem');
    const second = turn(open, 'volSel', 'up');
    expect(lineThree(second)).toBe('MEM 01');
    expect(second.standby).toBe(123450);
    const last = turn(open, 'volSel', 'down');
    expect(lineThree(last)).toBe('MEM 99');
    expect(last.standby).toBe(130000);
    expect(turn(open, 'volSel', 'up', 100).list).toEqual({ kind: 'mem', index: 0 });
  });

  it('leaves the standby frequency alone on an empty entry', () => {
    const open = tap(running, 'mem');
    expect(open.standby).toBe(119000);
    expect(listEntry(open)).toBeNull();
    expect(turn(open, 'volSel', 'up').standby).toBe(119000);
  });

  it('ends dual watch when browsing changes the standby frequency', () => {
    expect(tap(tap(withMemory({ 0: 122000 }), 'dw'), 'mem').dualWatch).toBe(false);
    expect(tap(tap(running, 'dw'), 'mem').dualWatch).toBe(true);
  });

  it('makes the entry active with the swap key and leaves the list', () => {
    const state = tap(tap(withMemory({ 0: 122800 }), 'mem'), 'swap');
    expect(state).toMatchObject({ active: 122800, standby: 118000, list: null });
    expect(state.recent).toEqual([122800]);
  });

  it('leaves the list with SET, DW or the cursor key, keeping the entry in standby', () => {
    const open = tap(withMemory({ 0: 122000 }), 'mem');
    for (const key of ['set', 'dw', 'cursor']) {
      const left = tap(open, key);
      expect(left, key).toMatchObject({ list: null, standby: 122000, item: 'vol' });
      expect(left, key).toMatchObject({ dualWatch: false, cursor: 'mhz' });
    }
  });

  it('leaves the list with the frequency knob, which then steps the standby frequency', () => {
    const left = turn(tap(withMemory({ 0: 122000 }), 'mem'), 'freq', 'up');
    expect(left).toMatchObject({ list: null, standby: 123000 });
  });

  it('stores the active frequency into the shown entry on a MEM hold and stays in the list', () => {
    const open = turn(tap(withMemory({ 17: 121270 }), 'mem'), 'volSel', 'up', 17);
    expect(open.standby).toBe(121270);
    const held = hold(open, 'mem', LONG_PRESS_MS);
    expect(held.memory[17]).toBe(118000);
    expect(held).toMatchObject({ standby: 118000, list: { kind: 'mem', index: 17 } });
    expect(release(held).list).toEqual({ kind: 'mem', index: 17 });
    expect(release(hold(open, 'mem', LONG_PRESS_MS + 2000)).list).toEqual({
      kind: 'mem',
      index: 17,
    });
  });

  it('does not store on a MEM press shorter than the hold', () => {
    const state = release(hold(tap(running, 'mem'), 'mem', LONG_PRESS_MS - 500));
    expect(state.memory.every((slot) => slot === null)).toBe(true);
    expect(state.list).toEqual({ kind: 'lst', index: 0 });
  });

  it('takes a MEM hold outside the memory list as a short press', () => {
    const held = hold(running, 'mem', LONG_PRESS_MS + 500);
    expect(held.memory.every((slot) => slot === null)).toBe(true);
    expect(release(held).list).toEqual({ kind: 'mem', index: 0 });
  });

  it('closes after the time-out and keeps what it put in standby and memory', () => {
    const stored = release(hold(tap(running, 'mem'), 'mem', LONG_PRESS_MS));
    const closed = wait(stored, MENU_TIMEOUT_MS);
    expect(closed).toMatchObject({ list: null, standby: 118000 });
    expect(closed.memory[0]).toBe(118000);
  });
});

describe('the last-used list', () => {
  let flown = running;
  for (const khz of [120000, 121000]) flown = tap({ ...flown, standby: khz }, 'swap');

  it('opens on the second short MEM press at LST 00 and closes on the third', () => {
    const lst = tap(tap(running, 'mem'), 'mem');
    expect(lst.list).toEqual({ kind: 'lst', index: 0 });
    expect(lineThree(lst)).toBe('LST 00');
    expect(tap(lst, 'mem').list).toBeNull();
  });

  it('lists the last active frequencies newest first from LST 01, each replacing standby', () => {
    const lst = tap(tap(flown, 'mem'), 'mem');
    const first = turn(lst, 'volSel', 'up');
    expect(lineThree(first)).toBe('LST 01');
    expect(first.standby).toBe(121000);
    const second = turn(first, 'volSel', 'up');
    expect(lineThree(second)).toBe('LST 02');
    expect(second.standby).toBe(120000);
    expect(turn(second, 'volSel', 'up').list).toEqual({ kind: 'lst', index: 0 });
    expect(tap(second, 'swap')).toMatchObject({ active: 120000, standby: 121000, list: null });
  });

  it('holds the last standby frequency the memory list set in LST 00', () => {
    const fromMemory = turn(tap(withMemory({ 1: 123450 }), 'mem'), 'volSel', 'up');
    expect(fromMemory.lastFromMemory).toBe(123450);
    const tuned = turn(tap(fromMemory, 'set'), 'freq', 'up');
    expect(tuned.standby).toBe(124450);
    const lst = tap(tap(tuned, 'mem'), 'mem');
    expect(lineThree(lst)).toBe('LST 00');
    expect(lst.standby).toBe(123450);
    expect(listEntry(lst)).toBe(123450);
  });

  it('shows an empty LST 00 and a list of one entry before anything was used', () => {
    const lst = tap(tap(running, 'mem'), 'mem');
    expect(listEntry(lst)).toBeNull();
    expect(lst.standby).toBe(119000);
    expect(turn(lst, 'volSel', 'up').list).toEqual({ kind: 'lst', index: 0 });
    expect(listEntry(running)).toBeNull();
  });
});

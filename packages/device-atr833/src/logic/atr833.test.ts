import { describe, expect, it } from 'vitest';
import {
  CHANNEL_NAMES,
  MEM_SAVE_HOLD_MS,
  MENU_TIMEOUT_MS,
  POWER_OFF_HOLD_MS,
  SETUP_MENU_HOLD_MS,
  atr833Device,
  formatFrequency,
  lineThree,
  listPreview,
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
const running = step(start);

const tap = (state: Atr833State, key: string) => step(step(state, { [key]: 'pressed' }), {});
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

  it('starts dark on 118.000 and 119.000', () => {
    expect(start).toMatchObject({ on: false, powered: false, active: 118000, standby: 119000 });
    expect(start).toMatchObject({ cursor: 'mhz', dualWatch: false, item: 'vol', list: null });
    expect(start.settings).toEqual({
      vol: 10,
      sql: 5,
      vox: 5,
      int: 10,
      stl: 10,
      str: 10,
      ext: 0,
      brt: 9,
    });
    expect(start.memory).toHaveLength(20);
    expect(start.memory.every((slot) => slot === null)).toBe(true);
    expect(start.recent).toEqual([]);
  });

  it('names no channel outside the 16 names of a 100 kHz block', () => {
    expect(CHANNEL_NAMES).toEqual([0, 5, 10, 15, 25, 30, 35, 40, 50, 55, 60, 65, 75, 80, 85, 90]);
    expect(formatFrequency(132055)).toBe('132.055');
  });
});

describe('power', () => {
  it('switches on when power arrives and keeps what was set', () => {
    expect(step(start, {}, { powered: false }).on).toBe(false);
    expect(running).toMatchObject({ on: true, powered: true, active: 118000, standby: 119000 });
  });

  it('switches off and clears the transients when power is lost, keeping the settings', () => {
    let state = tap(turn(running, 'freq', 'up', 3), 'dw');
    state = turn(tap(state, 'set'), 'volSel', 'up');
    state = step(state, { mem: 'pressed' });
    const lost = step(state, { mem: 'pressed' }, { powered: false });
    expect(lost).toMatchObject({
      on: false,
      powered: false,
      dualWatch: false,
      item: 'vol',
      list: null,
      idleMs: 0,
      saved: false,
      standby: state.standby,
    });
    expect(lost.settings).toEqual(state.settings);
    expect(lost.heldMs).toEqual({ power: 0, set: 0, mem: -1 });
  });

  it('ignores the keys while unpowered but records their positions', () => {
    const lost = step(running, { swap: 'pressed' }, { powered: false });
    expect(lost.active).toBe(118000);
    expect(lost.held.swap).toBe('pressed');
  });

  it('does not fire a button that is held while power arrives', () => {
    const held = step(start, { swap: 'pressed' }, { powered: false });
    const arrived = step(held, { swap: 'pressed' });
    expect(arrived).toMatchObject({ on: true, active: 118000, standby: 119000 });
  });

  it('does not act on a set or mem release of a key pressed before the unit was on', () => {
    const held = step(start, { set: 'pressed', mem: 'pressed' }, { powered: false });
    const arrived = step(held, { set: 'pressed', mem: 'pressed' });
    const freed = release(arrived);
    expect(freed).toMatchObject({ item: 'vol', list: null });
  });

  it('is switched on by a press while off and powered', () => {
    const off = hold(running, 'power', POWER_OFF_HOLD_MS);
    expect(off.on).toBe(false);
    const idle = release(off);
    expect(tap(idle, 'power').on).toBe(true);
  });

  it('stays on for a short press', () => {
    expect(tap(running, 'power').on).toBe(true);
    expect(release(hold(running, 'power', POWER_OFF_HOLD_MS - 500)).on).toBe(true);
  });

  it('switches off when the key is held for the off time', () => {
    const state = hold(running, 'power', POWER_OFF_HOLD_MS);
    expect(state.on).toBe(false);
    expect(state.powered).toBe(true);
    expect(state).toMatchObject({ active: 118000, standby: 119000 });
  });

  it('keeps holding after the off time without switching on again', () => {
    const state = hold(running, 'power', POWER_OFF_HOLD_MS + 2000);
    expect(state.on).toBe(false);
  });

  it('does not switch off again for the press that switched it on', () => {
    const off = release(hold(running, 'power', POWER_OFF_HOLD_MS));
    const state = hold(off, 'power', POWER_OFF_HOLD_MS + 1000);
    expect(state.on).toBe(true);
  });

  it('clears the transients when held off, keeping frequencies, settings and memory', () => {
    let state = tap(tap(running, 'dw'), 'set');
    state = hold(state, 'power', POWER_OFF_HOLD_MS);
    expect(state).toMatchObject({ dualWatch: false, item: 'vol', list: null });
    const back = tap(release(state), 'power');
    expect(back).toMatchObject({ on: true, cursor: 'mhz', active: 118000, standby: 119000 });
  });

  it('ignores every other key while off', () => {
    const off = release(hold(running, 'power', POWER_OFF_HOLD_MS));
    expect(tap(off, 'swap')).toMatchObject({ active: 118000, standby: 119000 });
    expect(turn(off, 'freq', 'up').standby).toBe(119000);
  });

  it('keeps the frequencies through a power cycle', () => {
    const tuned = tap(turn(running, 'freq', 'up'), 'swap');
    const cycled = step(step(tuned, {}, { powered: false }), {});
    expect(cycled).toMatchObject({ on: true, active: 120000, standby: 118000 });
  });
});

describe('frequency entry', () => {
  it('steps the MHz field from power-on, wrapping without a carry', () => {
    expect(turn(running, 'freq', 'up').standby).toBe(120000);
    expect(turn(running, 'freq', 'down').standby).toBe(118000);
    const top = { ...running, standby: 136000 };
    expect(turn(top, 'freq', 'up').standby).toBe(118000);
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
    const held = step(first, { freq: 'up' }, { dtMs: 500 });
    expect(held.standby).toBe(120000);
  });

  it('counts a change from one turn direction to the other', () => {
    const up = step(running, { freq: 'up' });
    expect(step(up, { freq: 'down' }).standby).toBe(119000);
  });
});

describe('swap and dual watch', () => {
  it('exchanges the active and standby frequencies', () => {
    const state = tap(turn(running, 'freq', 'up'), 'swap');
    expect(state).toMatchObject({ active: 120000, standby: 118000 });
  });

  it('adds a frequency that becomes active to the recent list, newest first without repeats', () => {
    let state = tap(turn(running, 'freq', 'up'), 'swap');
    expect(state.recent).toEqual([120000]);
    state = tap(state, 'swap');
    state = tap(state, 'swap');
    expect(state.recent).toEqual([120000, 118000]);
  });

  it('keeps at most ten recent frequencies', () => {
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

  it('needs a squelch of at least 1 for dual watch', () => {
    const open = { ...running, settings: { ...running.settings, sql: 0 } };
    expect(tap(open, 'dw').dualWatch).toBe(false);
  });
});

describe('SET items and the VOL/SEL knob', () => {
  it('steps the volume on the standard display', () => {
    expect(turn(running, 'volSel', 'up').settings.vol).toBe(11);
    expect(turn(running, 'volSel', 'down', 2).settings.vol).toBe(8);
  });

  it('steps line 3 through VOL, SQL, VOX, INT, STL, STR, EXT, BRT and back to VOL', () => {
    const items: string[] = [];
    let state = running;
    for (let count = 0; count < 9; count++) {
      items.push(state.item);
      state = tap(state, 'set');
    }
    expect(items).toEqual(['vol', 'sql', 'vox', 'int', 'stl', 'str', 'ext', 'brt', 'vol']);
  });

  it('changes the chosen item with the knob within its range', () => {
    const sql = tap(running, 'set');
    expect(turn(sql, 'volSel', 'up').settings.sql).toBe(6);
    expect(turn(sql, 'volSel', 'up', 20).settings.sql).toBe(9);
    expect(turn(sql, 'volSel', 'down', 20).settings.sql).toBe(0);
    expect(turn(running, 'volSel', 'down', 30).settings.vol).toBe(1);
    expect(turn(running, 'volSel', 'up', 30).settings.vol).toBe(20);
  });

  it('shows line 3 as the item and its value', () => {
    expect(lineThree(running)).toBe('VOL 10');
    expect(lineThree(tap(running, 'set'))).toBe('SQL 5');
    const ext = { ...running, item: 'ext' as const };
    expect(lineThree(ext)).toBe('EXT off');
    expect(lineThree({ ...ext, settings: { ...ext.settings, ext: 4 } })).toBe('EXT 4');
  });

  it('acts on the release of SET, not its press', () => {
    const pressed = step(running, { set: 'pressed' });
    expect(pressed.item).toBe('vol');
    expect(release(pressed).item).toBe('sql');
  });

  it('takes the release that ends a setup-menu hold of SET as nothing', () => {
    expect(release(hold(running, 'set', SETUP_MENU_HOLD_MS - 500)).item).toBe('sql');
    expect(release(hold(running, 'set', SETUP_MENU_HOLD_MS + 1000)).item).toBe('vol');
  });

  it('returns to the standard display after the menu time-out without input', () => {
    const state = tap(running, 'set');
    expect(wait(state, MENU_TIMEOUT_MS - 1).item).toBe('sql');
    expect(wait(state, MENU_TIMEOUT_MS).item).toBe('vol');
  });

  it('restarts the time-out on every input', () => {
    let state = tap(running, 'set');
    state = wait(state, MENU_TIMEOUT_MS - 1000);
    state = turn(state, 'volSel', 'up');
    expect(wait(state, MENU_TIMEOUT_MS - 1).item).toBe('sql');
  });

  it('goes back to the standard display with DW', () => {
    const state = tap(tap(running, 'set'), 'dw');
    expect(state).toMatchObject({ item: 'vol', dualWatch: false });
  });
});

describe('memory and the last-active list', () => {
  const tuned = (khz: number) => ({ ...running, standby: khz });

  it('opens the memory list on a short MEM release and the recent list on the next', () => {
    const mem = tap(running, 'mem');
    expect(mem.list).toEqual({ kind: 'mem', index: 0 });
    expect(tap(mem, 'mem').list).toEqual({ kind: 'lst', index: 0 });
    expect(tap(tap(mem, 'mem'), 'mem').list).toBeNull();
  });

  it('acts on the release of MEM, not its press', () => {
    const pressed = step(running, { mem: 'pressed' });
    expect(pressed.list).toBeNull();
    expect(release(pressed).list).toEqual({ kind: 'mem', index: 0 });
  });

  it('browses the slots with the knob and wraps', () => {
    const mem = tap(running, 'mem');
    expect(turn(mem, 'volSel', 'up').list).toEqual({ kind: 'mem', index: 1 });
    expect(turn(mem, 'volSel', 'down').list).toEqual({ kind: 'mem', index: 19 });
    expect(turn(mem, 'volSel', 'up', 20).list).toEqual({ kind: 'mem', index: 0 });
  });

  it('saves the standby frequency: hold MEM, pick a slot, press MEM briefly', () => {
    const held = hold(tuned(121500), 'mem', MEM_SAVE_HOLD_MS);
    expect(held.list).toEqual({ kind: 'save', index: 0 });
    const freed = release(held);
    expect(freed.list).toEqual({ kind: 'save', index: 0 });
    const picked = turn(freed, 'volSel', 'up', 2);
    expect(lineThree(picked)).toBe('MEM SAVE 03');
    const saved = tap(picked, 'mem');
    expect(saved.memory[2]).toBe(121500);
    expect(saved).toMatchObject({ list: null, saved: true, standby: 121500 });
  });

  it('does not save when MEM is held for less than the hold time', () => {
    const state = release(hold(tuned(121500), 'mem', MEM_SAVE_HOLD_MS - 500));
    expect(state.list).toEqual({ kind: 'mem', index: 0 });
  });

  it('takes the release that ends the save hold as nothing more', () => {
    const state = release(hold(tuned(121500), 'mem', MEM_SAVE_HOLD_MS + 1000));
    expect(state.list).toEqual({ kind: 'save', index: 0 });
    expect(state.memory.every((slot) => slot === null)).toBe(true);
  });

  it('clears the saved mark when the standby frequency changes', () => {
    const saved = tap(turn(hold(tuned(121500), 'mem', MEM_SAVE_HOLD_MS), 'volSel', 'up'), 'mem');
    expect(saved.saved).toBe(true);
    expect(turn(saved, 'freq', 'up').saved).toBe(false);
    expect(tap(saved, 'swap').saved).toBe(false);
  });

  it('loads a slot into the standby frequency with SET and closes the list', () => {
    const memory = [...start.memory];
    memory[1] = 123450;
    const state = turn(tap({ ...running, memory }, 'mem'), 'volSel', 'up');
    expect(lineThree(state)).toBe('MEM 02');
    expect(listPreview(state)).toBe('123.450');
    const loaded = tap(state, 'set');
    expect(loaded).toMatchObject({ standby: 123450, list: null, active: 118000 });
  });

  it('loads a slot into the active frequency with the swap key', () => {
    const memory = [...start.memory];
    memory[0] = 122800;
    const state = tap(tap({ ...running, memory }, 'mem'), 'swap');
    expect(state).toMatchObject({ active: 122800, standby: 119000, list: null });
    expect(state.recent).toEqual([122800]);
  });

  it('leaves an empty slot alone', () => {
    const mem = tap(running, 'mem');
    expect(lineThree(mem)).toBe('MEM 01');
    expect(listPreview(mem)).toBe('---');
    expect(tap(mem, 'set')).toMatchObject({ list: mem.list, standby: 119000 });
    expect(tap(mem, 'swap')).toMatchObject({ list: mem.list, active: 118000 });
  });

  it('lists the last active frequencies newest first', () => {
    let state = running;
    for (const khz of [120000, 121000]) state = tap({ ...state, standby: khz }, 'swap');
    const list = tap(tap(state, 'mem'), 'mem');
    expect(lineThree(list)).toBe('LST 01');
    expect(listPreview(list)).toBe('121.000');
    const second = turn(list, 'volSel', 'up');
    expect(lineThree(second)).toBe('LST 02');
    expect(listPreview(second)).toBe('120.000');
    expect(tap(second, 'set').standby).toBe(120000);
  });

  it('shows an empty recent list', () => {
    const list = tap(tap(running, 'mem'), 'mem');
    expect(lineThree(list)).toBe('LST 01');
    expect(listPreview(list)).toBe('---');
    expect(listPreview(running)).toBeNull();
    expect(listPreview(hold(running, 'mem', MEM_SAVE_HOLD_MS))).toBeNull();
    expect(turn(list, 'volSel', 'up').list).toEqual({ kind: 'lst', index: 0 });
  });

  it('goes back to the standard display with DW', () => {
    expect(tap(tap(running, 'mem'), 'dw')).toMatchObject({ list: null, dualWatch: false });
    const save = hold(running, 'mem', MEM_SAVE_HOLD_MS);
    expect(tap(release(save), 'dw').list).toBeNull();
  });

  it('closes a list after the menu time-out and keeps the memory', () => {
    const saved = tap(turn(hold(running, 'mem', MEM_SAVE_HOLD_MS), 'volSel', 'up'), 'mem');
    const open = tap(saved, 'mem');
    const closed = wait(open, MENU_TIMEOUT_MS);
    expect(closed.list).toBeNull();
    expect(closed.memory[1]).toBe(119000);
  });

  it('keeps the memory and recent list through a power cycle', () => {
    const saved = tap(turn(hold(running, 'mem', MEM_SAVE_HOLD_MS), 'volSel', 'up'), 'mem');
    const cycled = step(step(saved, {}, { powered: false }), {});
    expect(cycled.memory).toEqual(saved.memory);
  });
});

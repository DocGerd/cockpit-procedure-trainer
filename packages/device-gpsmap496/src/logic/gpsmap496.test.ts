import { describe, expect, it } from 'vitest';
import { BACKLIGHT_LEVELS, KEYS, PAGES, gpsmap496Device } from './gpsmap496';
import type { Gpsmap496State } from './gpsmap496';

const released: Record<string, string> = Object.fromEntries(KEYS.map((key) => [key, 'released']));

const step = (state: Gpsmap496State, controls: Record<string, string> = {}, powered = true) =>
  gpsmap496Device.step(state, {
    controls: { ...released, ...controls },
    powered,
    inputs: {},
    dtMs: 0,
  }) as Gpsmap496State;

const start = gpsmap496Device.initial as Gpsmap496State;
const tap = (state: Gpsmap496State, key: string, powered = true) =>
  step(step(state, { [key]: 'pressed' }, powered), {}, powered);
const running = tap(start, 'power');

describe('gpsmap496Device', () => {
  it('declares four momentary keys', () => {
    expect(Object.keys(gpsmap496Device.controls)).toEqual([...KEYS]);
    for (const key of KEYS) expect(gpsmap496Device.controls[key]?.kind).toBe('momentary');
    expect(KEYS).toEqual(['power', 'backlight', 'page', 'quit']);
  });

  it('starts switched off on the first page at the middle backlight level', () => {
    expect(start).toMatchObject({ on: false, page: 'map', backlight: 1 });
    expect(BACKLIGHT_LEVELS).toBe(3);
  });

  it('switches on and off with the power key while powered', () => {
    expect(running.on).toBe(true);
    expect(tap(running, 'power').on).toBe(false);
  });

  it('counts one press per press and release, not per step', () => {
    const held = step(step(running, { power: 'pressed' }), { power: 'pressed' });
    expect(held.on).toBe(false);
  });

  it('ignores the power key without power', () => {
    expect(tap(start, 'power', false).on).toBe(false);
  });

  it('switches off and returns to the first page when power is lost', () => {
    const onPage = tap(running, 'page');
    expect(onPage.page).toBe('terrain');
    const lost = step(onPage, {}, false);
    expect(lost).toMatchObject({ on: false, page: 'map' });
    expect(tap(lost, 'power').on).toBe(true);
  });

  it('cycles the pages forward with PAGE and wraps', () => {
    let state = running;
    const seen: string[] = [];
    for (let index = 0; index < PAGES.length; index += 1) {
      state = tap(state, 'page');
      seen.push(state.page);
    }
    expect(seen).toEqual([...PAGES.slice(1), PAGES[0]]);
  });

  it('cycles the pages backward with QUIT and wraps', () => {
    expect(tap(running, 'quit').page).toBe(PAGES[PAGES.length - 1]);
  });

  it('cycles the backlight through its levels', () => {
    const levels: number[] = [];
    let state = running;
    for (let index = 0; index < BACKLIGHT_LEVELS; index += 1) {
      state = tap(state, 'backlight');
      levels.push(state.backlight);
    }
    expect(levels).toEqual([2, 0, 1]);
  });

  it('ignores page and backlight keys while switched off', () => {
    expect(tap(start, 'page').page).toBe('map');
    expect(tap(start, 'backlight').backlight).toBe(1);
  });

  it('keeps the backlight setting across a power loss', () => {
    const dimmer = tap(running, 'backlight');
    expect(step(dimmer, {}, false).backlight).toBe(dimmer.backlight);
  });
});

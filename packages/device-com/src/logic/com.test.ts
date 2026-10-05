import { describe, expect, it } from 'vitest';
import {
  COM_MAX_KHZ,
  COM_MIN_KHZ,
  COM_SPACING_KHZ,
  comDevice,
  formatFrequency,
  type ComState,
} from './com';

const rest = { coarse: 'rest', fine: 'rest', swap: 'released', volume: 0.5 };

const stepWith = (state: ComState, controls: Record<string, string | number>, powered = true) =>
  comDevice.step(state, {
    controls: { ...rest, ...controls },
    powered,
    inputs: {},
    dtMs: 0,
  }) as ComState;

const withFrequencies = (active: number, standby: number): ComState => ({
  ...(comDevice.initial as ComState),
  active,
  standby,
});

const click = (state: ComState, knob: 'coarse' | 'fine', direction: 'up' | 'down') =>
  stepWith(stepWith(state, { [knob]: direction }), {});

describe('comDevice', () => {
  it('declares its controls and starts on channels inside the band', () => {
    expect(Object.keys(comDevice.controls)).toEqual(['volume', 'coarse', 'fine', 'swap']);
    const initial = comDevice.initial as ComState;
    for (const khz of [initial.active, initial.standby]) {
      expect(khz).toBeGreaterThanOrEqual(COM_MIN_KHZ);
      expect(khz).toBeLessThanOrEqual(COM_MAX_KHZ);
      expect(khz % COM_SPACING_KHZ).toBe(0);
    }
  });

  it('states its manual revision and what it does not model', () => {
    expect(comDevice.manual.en).not.toBe('');
    expect(comDevice.notModelled.length).toBeGreaterThan(0);
  });

  it('declares rotary knobs that spring back and a momentary swap', () => {
    const { coarse, fine, swap } = comDevice.controls;
    expect(coarse).toMatchObject({ kind: 'rotary', springBack: { up: 'rest', down: 'rest' } });
    expect(fine).toMatchObject({ kind: 'rotary', springBack: { up: 'rest', down: 'rest' } });
    expect(swap?.kind).toBe('momentary');
  });
});

describe('power', () => {
  it('ignores knob input while unpowered and does not replay it at power-up', () => {
    const start = withFrequencies(118000, 119000);
    const off = stepWith(start, { coarse: 'up', swap: 'pressed' }, false);
    expect(off.standby).toBe(119000);
    expect(off.active).toBe(118000);
    const held = stepWith(off, { coarse: 'up', swap: 'pressed' });
    expect(held.standby).toBe(119000);
    expect(held.active).toBe(118000);
  });

  it('keeps its settings through a power cycle', () => {
    const start = withFrequencies(120000, 121000);
    const off = stepWith(start, {}, false);
    expect(stepWith(off, {})).toMatchObject({ active: 120000, standby: 121000 });
  });

  it('ignores volume while unpowered and follows it when powered', () => {
    const start = comDevice.initial as ComState;
    expect(stepWith(start, { volume: 0.9 }, false).volume).toBe(start.volume);
    expect(stepWith(start, { volume: 0.9 }).volume).toBe(0.9);
  });

  it('keeps the volume between 0 and 1', () => {
    const start = comDevice.initial as ComState;
    expect(stepWith(start, { volume: 1.5 }).volume).toBe(1);
    expect(stepWith(start, { volume: -0.5 }).volume).toBe(0);
  });
});

describe('frequency entry', () => {
  it('moves the standby by one MHz per coarse click', () => {
    const start = withFrequencies(118000, 120350);
    expect(click(start, 'coarse', 'up').standby).toBe(121350);
    expect(click(start, 'coarse', 'down').standby).toBe(119350);
  });

  it('moves the standby by one channel per fine click', () => {
    const start = withFrequencies(118000, 120350);
    expect(click(start, 'fine', 'up').standby).toBe(120350 + COM_SPACING_KHZ);
    expect(click(start, 'fine', 'down').standby).toBe(120350 - COM_SPACING_KHZ);
  });

  it('counts a held knob once', () => {
    const start = withFrequencies(118000, 120000);
    const held = stepWith(stepWith(start, { coarse: 'up' }), { coarse: 'up' });
    expect(held.standby).toBe(121000);
  });

  it('wraps the coarse knob at both ends of the band and keeps the channel', () => {
    expect(click(withFrequencies(118000, 136250), 'coarse', 'up').standby).toBe(118250);
    expect(click(withFrequencies(118000, 118250), 'coarse', 'down').standby).toBe(136250);
  });

  it('wraps the fine knob inside its MHz', () => {
    expect(click(withFrequencies(118000, 120975), 'fine', 'up').standby).toBe(120000);
    expect(click(withFrequencies(118000, 120000), 'fine', 'down').standby).toBe(120975);
  });

  it('keeps the standby on the channel spacing and inside the band over a long run', () => {
    let state = withFrequencies(118000, 118000);
    for (let index = 0; index < 200; index++) {
      state = click(state, index % 3 === 0 ? 'coarse' : 'fine', index % 5 === 0 ? 'down' : 'up');
      expect(state.standby % COM_SPACING_KHZ).toBe(0);
      expect(state.standby).toBeGreaterThanOrEqual(COM_MIN_KHZ);
      expect(state.standby).toBeLessThanOrEqual(COM_MAX_KHZ);
    }
  });

  it('never changes the active frequency', () => {
    expect(click(withFrequencies(118000, 120000), 'coarse', 'up').active).toBe(118000);
  });
});

describe('swap', () => {
  it('exchanges active and standby once per press', () => {
    const start = withFrequencies(118000, 120350);
    const pressed = stepWith(start, { swap: 'pressed' });
    expect(pressed).toMatchObject({ active: 120350, standby: 118000 });
    expect(stepWith(pressed, { swap: 'pressed' })).toMatchObject({
      active: 120350,
      standby: 118000,
    });
    const again = stepWith(stepWith(pressed, {}), { swap: 'pressed' });
    expect(again).toMatchObject({ active: 118000, standby: 120350 });
  });
});

describe('formatFrequency', () => {
  it('shows MHz with three decimals', () => {
    expect(formatFrequency(118000)).toBe('118.000');
    expect(formatFrequency(120350)).toBe('120.350');
    expect(formatFrequency(136975)).toBe('136.975');
  });
});

describe('step', () => {
  it('is pure', () => {
    const start = withFrequencies(118000, 120000);
    const before = JSON.stringify(start);
    stepWith(start, { coarse: 'up' });
    expect(JSON.stringify(start)).toBe(before);
  });
});

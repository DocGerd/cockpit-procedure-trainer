import { describe, expect, it } from 'vitest';
import {
  IDENT_DURATION_MS,
  MODES,
  PRESSURE_ALTITUDE_INPUT,
  transponderDevice,
  type TransponderState,
} from './transponder';

const rest = {
  mode: 'off',
  code1: '7',
  code2: '0',
  code3: '0',
  code4: '0',
  ident: 'released',
};

type Options = {
  powered?: boolean;
  dtMs?: number;
  altitude?: number;
};

const stepWith = (
  state: TransponderState,
  controls: Record<string, string | number> = {},
  { powered = true, dtMs = 0, altitude }: Options = {},
) =>
  transponderDevice.step(state, {
    controls: { ...rest, ...controls },
    powered,
    inputs: altitude === undefined ? {} : { [PRESSURE_ALTITUDE_INPUT]: altitude },
    dtMs,
  }) as TransponderState;

const start = transponderDevice.initial as TransponderState;

const press = (state: TransponderState, mode: string, options?: Options) =>
  stepWith(state, { mode, ident: 'pressed' }, options);

describe('transponderDevice', () => {
  it('declares its controls', () => {
    expect(Object.keys(transponderDevice.controls)).toEqual([
      'mode',
      'code1',
      'code2',
      'code3',
      'code4',
      'ident',
    ]);
    expect(transponderDevice.controls.mode).toMatchObject({
      kind: 'rotary',
      positions: ['off', 'stby', 'on', 'alt'],
    });
    expect(transponderDevice.controls.ident?.kind).toBe('momentary');
  });

  it('allows only the digits 0 to 7 in each squawk position', () => {
    for (const id of ['code1', 'code2', 'code3', 'code4']) {
      expect(transponderDevice.controls[id]).toMatchObject({
        kind: 'rotary',
        positions: ['0', '1', '2', '3', '4', '5', '6', '7'],
      });
    }
  });

  it('states its manual revision and what it does not model', () => {
    expect(transponderDevice.manual.en).not.toBe('');
    expect(transponderDevice.notModelled.length).toBeGreaterThan(0);
    expect(MODES).toEqual(['off', 'stby', 'on', 'alt']);
  });
});

describe('squawk', () => {
  it('starts at the control defaults', () => {
    expect(start.squawk).toBe('7000');
    expect(stepWith(start).squawk).toBe('7000');
  });

  it('follows the four digit controls', () => {
    const next = stepWith(start, { code1: '1', code2: '2', code3: '0', code4: '7' });
    expect(next.squawk).toBe('1207');
  });

  it('keeps a digit that is not 0 to 7', () => {
    const next = stepWith(start, { code1: '8', code2: '9', code3: 'x', code4: 3 });
    expect(next.squawk).toBe('7000');
  });
});

describe('mode', () => {
  it.each(['off', 'stby', 'on', 'alt'])('follows the mode control: %s', (mode) => {
    expect(stepWith(start, { mode }).mode).toBe(mode);
  });

  it('keeps the previous mode for an unknown position', () => {
    expect(stepWith(stepWith(start, { mode: 'on' }), { mode: 'test' }).mode).toBe('on');
  });
});

describe('power', () => {
  it('ignores the controls while unpowered', () => {
    const next = stepWith(start, { mode: 'alt', code1: '1' }, { powered: false, altitude: 4500 });
    expect(next.mode).toBe(start.mode);
    expect(next.squawk).toBe(start.squawk);
    expect(next.altitude).toBeNull();
  });

  it('keeps its settings through a power cycle', () => {
    const set = stepWith(start, { mode: 'alt', code1: '1' });
    const off = stepWith(set, { mode: 'alt', code1: '1' }, { powered: false });
    expect(off.mode).toBe('alt');
    expect(off.squawk).toBe('1000');
    expect(stepWith(off, { mode: 'alt', code1: '1' })).toMatchObject({
      mode: 'alt',
      squawk: '1000',
    });
  });

  it('drops an ident reply when power is lost and does not replay a held button', () => {
    const replying = press(start, 'on');
    expect(replying.ident).toBe(true);
    const off = press(replying, 'on', { powered: false });
    expect(off.ident).toBe(false);
    expect(off.identRemainingMs).toBe(0);
    expect(press(off, 'on').ident).toBe(false);
  });
});

describe('altitude input', () => {
  it('is exposed in ALT only', () => {
    expect(stepWith(start, { mode: 'alt' }, { altitude: 4500 }).altitude).toBe(4500);
    for (const mode of ['off', 'stby', 'on']) {
      expect(stepWith(start, { mode }, { altitude: 4500 }).altitude).toBeNull();
    }
  });

  it('is absent without a usable input', () => {
    expect(stepWith(start, { mode: 'alt' }).altitude).toBeNull();
    expect(stepWith(start, { mode: 'alt' }, { altitude: Number.NaN }).altitude).toBeNull();
  });

  it('follows the input as it changes', () => {
    const first = stepWith(start, { mode: 'alt' }, { altitude: 1000 });
    expect(stepWith(first, { mode: 'alt' }, { altitude: 1200 }).altitude).toBe(1200);
  });
});

describe('ident', () => {
  it.each(['on', 'alt'])('sets the reply flag in %s', (mode) => {
    const next = press(start, mode);
    expect(next.ident).toBe(true);
    expect(next.identRemainingMs).toBe(IDENT_DURATION_MS);
  });

  it.each(['off', 'stby'])('does nothing in %s', (mode) => {
    expect(press(start, mode).ident).toBe(false);
  });

  it('clears the flag after the declared time', () => {
    const replying = press(start, 'on');
    const nearly = stepWith(replying, { mode: 'on' }, { dtMs: IDENT_DURATION_MS - 1 });
    expect(nearly.ident).toBe(true);
    const done = stepWith(nearly, { mode: 'on' }, { dtMs: 1 });
    expect(done.ident).toBe(false);
    expect(done.identRemainingMs).toBe(0);
  });

  it('restarts the time on another press', () => {
    const replying = press(start, 'on');
    const later = stepWith(replying, { mode: 'on' }, { dtMs: 10_000 });
    const again = press(stepWith(later, { mode: 'on' }), 'on');
    expect(again.identRemainingMs).toBe(IDENT_DURATION_MS);
  });

  it('counts a held button once', () => {
    const replying = press(start, 'on');
    const held = press(replying, 'on', { dtMs: 5_000 });
    expect(held.identRemainingMs).toBe(IDENT_DURATION_MS - 5_000);
  });

  it('ends when the mode drops to STBY or OFF', () => {
    const replying = press(start, 'alt');
    expect(stepWith(replying, { mode: 'stby' }).ident).toBe(false);
    expect(stepWith(replying, { mode: 'off' }).ident).toBe(false);
  });
});

describe('step', () => {
  it('is pure', () => {
    const before = JSON.stringify(start);
    press(start, 'alt', { altitude: 3000, dtMs: 50 });
    expect(JSON.stringify(start)).toBe(before);
  });
});

import { describe, expect, it } from 'vitest';
import { transponderReadout } from './readout';
import { transponderDevice } from './transponder';
import type { TransponderState } from './transponder';

const state: TransponderState = {
  ...(transponderDevice.initial as TransponderState),
  mode: 'alt',
  squawk: '1200',
  altitude: 3499.6,
};

describe('transponderReadout', () => {
  it('reads out the mode, the code and the reported altitude', () => {
    expect(transponderReadout(state, 'en', true)).toBe('Mode ALT, code 1200, altitude 3500 feet');
    expect(transponderReadout(state, 'de', true)).toBe('Modus ALT, Code 1200, Höhe 3500 Fuß');
  });

  it('leaves out the altitude while none is reported', () => {
    expect(transponderReadout({ ...state, altitude: null }, 'en', true)).toBe(
      'Mode ALT, code 1200',
    );
  });

  it('adds the ident while it is active', () => {
    expect(transponderReadout({ ...state, ident: true }, 'en', true)).toBe(
      'Mode ALT, code 1200, altitude 3500 feet, ident',
    );
    expect(transponderReadout({ ...state, ident: true }, 'de', true)).toBe(
      'Modus ALT, Code 1200, Höhe 3500 Fuß, Ident',
    );
  });

  it('reads out the off mode and a dark unit as off', () => {
    expect(transponderReadout({ ...state, mode: 'off' }, 'en', true)).toBe('Off');
    expect(transponderReadout(state, 'en', false)).toBe('Off');
    expect(transponderReadout(state, 'de', false)).toBe('Aus');
  });
});

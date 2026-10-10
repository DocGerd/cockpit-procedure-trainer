import { describe, expect, it } from 'vitest';
import { bottomRightText, levelText, modeText, trt800hReadout } from './readout';
import { trt800hDevice } from './trt800h';
import type { Trt800hState } from './trt800h';

const state: Trt800hState = {
  ...(trt800hDevice.initial as Trt800hState),
  on: true,
  mode: 'acs',
  squawk: '1200',
  standby: '2000',
  flightLevel: 30,
};

describe('display texts', () => {
  it('prints the mode only in an active mode', () => {
    expect(modeText(state)).toBe('ACS');
    expect(modeText({ ...state, mode: 'as' })).toBe('A-S');
    expect(modeText({ ...state, mode: 'stby' })).toBe('');
  });

  it('pads the flight level to three digits and shows FLerr without a valid level', () => {
    expect(levelText(state)).toBe('FL 030');
    expect(levelText({ ...state, flightLevel: 350 })).toBe('FL 350');
    expect(levelText({ ...state, flightLevel: 0 })).toBe('FL 000');
    expect(levelText({ ...state, flightLevel: -10 })).toBe('FL -10');
    expect(levelText({ ...state, flightLevel: null })).toBe('FLerr');
  });

  it('shows the standby code, VFR, or S after a store', () => {
    expect(bottomRightText(state)).toBe('2000');
    expect(bottomRightText({ ...state, vfrShown: true })).toBe('VFR');
    expect(bottomRightText({ ...state, vfrShown: true, storedMs: 1 })).toBe('S');
  });
});

describe('trt800hReadout', () => {
  it('reads out the mode, the codes and the flight level', () => {
    expect(trt800hReadout(state, 'en', true)).toBe(
      'Mode ACS, code 1200, FL 030, standby code 2000',
    );
    expect(trt800hReadout(state, 'de', true)).toBe(
      'Modus ACS, Code 1200, FL 030, Bereitschaftscode 2000',
    );
  });

  it('names standby and an invalid level', () => {
    const standby = { ...state, mode: 'stby', flightLevel: null } as const;
    expect(trt800hReadout(standby, 'en', true)).toContain('Mode standby');
    expect(trt800hReadout(standby, 'en', true)).toContain('FL error');
    expect(trt800hReadout(standby, 'de', true)).toContain('Modus Standby');
    expect(trt800hReadout(standby, 'de', true)).toContain('FL-Fehler');
  });

  it('adds the ident and VFR', () => {
    const shown = { ...state, identMs: 5000, vfrShown: true };
    expect(trt800hReadout(shown, 'en', true)).toBe('Mode ACS, code 1200, FL 030, ident, VFR shown');
    expect(trt800hReadout(shown, 'de', true)).toContain(', Ident, VFR angezeigt');
  });

  it('reads out the cursor place', () => {
    expect(trt800hReadout({ ...state, cursor: 1 }, 'en', true)).toContain(
      'standby code 2000, digit 2',
    );
    expect(trt800hReadout({ ...state, cursor: 0 }, 'de', true)).toContain('Ziffer 1');
  });

  it('reads out off while the unit is switched off or dark', () => {
    expect(trt800hReadout(state, 'en', false)).toBe('Off');
    expect(trt800hReadout(state, 'de', false)).toBe('Aus');
    expect(trt800hReadout({ ...state, on: false }, 'en', true)).toBe('Off');
    expect(trt800hReadout({ ...state, on: false }, 'de', true)).toBe('Aus');
  });
});

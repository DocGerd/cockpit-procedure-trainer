import { describe, expect, it } from 'vitest';
import { gtx327Device } from './gtx327';
import type { Gtx327State } from './gtx327';
import { codeText, formatTimer, gtx327Readout, readingText } from './readout';

const state: Gtx327State = {
  ...(gtx327Device.initial as Gtx327State),
  mode: 'alt',
  squawk: '1200',
  entry: '',
  altitude: 4500,
  ident: false,
  page: 'altitude',
  timerMs: 0,
};

describe('gtx327Readout', () => {
  it('reads out the mode, the code and the altitude', () => {
    expect(gtx327Readout(state, 'en', true)).toBe('Mode ALT, code 1200, 4500 feet');
    expect(gtx327Readout(state, 'de', true)).toBe('Modus ALT, Code 1200, 4500 Fuß');
  });

  it('reads out the timer on the count-up page', () => {
    const timing = { ...state, page: 'countUp', timerMs: 3_725_000 } as const;
    expect(gtx327Readout(timing, 'en', true)).toBe('Mode ALT, code 1200, timer 1:02:05');
    expect(gtx327Readout(timing, 'de', true)).toBe('Modus ALT, Code 1200, Zeitgeber 1:02:05');
  });

  it('adds the ident while it is active', () => {
    expect(gtx327Readout({ ...state, ident: true }, 'en', true)).toBe(
      'Mode ALT, code 1200, 4500 feet, ident',
    );
    expect(gtx327Readout({ ...state, ident: true }, 'de', true)).toContain(', Ident');
  });

  it('reads out the code being keyed in and the test pattern', () => {
    expect(gtx327Readout({ ...state, entry: '12' }, 'en', true)).toContain('code 12__');
    expect(gtx327Readout({ ...state, mode: 'tst' }, 'en', true)).toContain('code 8888');
  });

  it('leaves out the reading while there is none', () => {
    expect(gtx327Readout({ ...state, altitude: null }, 'en', true)).toBe('Mode ALT, code 1200');
  });

  it('reads out the off mode and a dark unit as off', () => {
    expect(gtx327Readout({ ...state, mode: 'off' }, 'en', true)).toBe('Off');
    expect(gtx327Readout(state, 'en', false)).toBe('Off');
    expect(gtx327Readout(state, 'de', false)).toBe('Aus');
  });
});

describe('display text', () => {
  it('formats the timer as hours, minutes and seconds', () => {
    expect(formatTimer(0)).toBe('0:00:00');
    expect(formatTimer(61_999)).toBe('0:01:01');
  });

  it('shows the squawk, the entry padded to four, or the test pattern', () => {
    expect(codeText(state)).toBe('1200');
    expect(codeText({ ...state, entry: '7' })).toBe('7___');
    expect(codeText({ ...state, mode: 'tst' })).toBe('8888');
  });

  it('shows the altitude, the timer, or nothing', () => {
    expect(readingText(state)).toBe('4500 FT');
    expect(readingText({ ...state, altitude: null })).toBe('');
    expect(readingText({ ...state, page: 'countUp', timerMs: 5000 })).toBe('0:00:05');
  });
});

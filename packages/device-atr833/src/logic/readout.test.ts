import { describe, expect, it } from 'vitest';
import { atr833Device } from './atr833';
import type { Atr833State } from './atr833';
import { atr833Readout } from './readout';

const start: Atr833State = { ...(atr833Device.initial as Atr833State), on: true };
const memory = [...start.memory];
memory[2] = 123450;

describe('atr833Readout', () => {
  it('reads the frequencies and the volume in both languages', () => {
    expect(atr833Readout(start, 'en', true)).toBe(
      'Active 118.000 MHz, standby 119.000 MHz, volume 10',
    );
    expect(atr833Readout(start, 'de', true)).toBe(
      'Aktiv 118,000 MHz, Standby 119,000 MHz, Lautstärke 10',
    );
  });

  it('reads dual watch and the chosen item, a negative DWM included', () => {
    const state: Atr833State = {
      ...start,
      dualWatch: true,
      item: 'dwm',
      settings: { ...start.settings, dwm: -2 },
    };
    expect(atr833Readout(state, 'en', true)).toBe(
      'Active 118.000 MHz, dual watch 119.000 MHz, DWM -2',
    );
    expect(atr833Readout({ ...state, item: 'dim' }, 'de', true)).toBe(
      'Aktiv 118,000 MHz, Doppelhören 119,000 MHz, Helligkeit 10',
    );
  });

  it('reads a list entry by its number and an empty one as empty', () => {
    const entry: Atr833State = {
      ...start,
      memory,
      standby: 123450,
      list: { kind: 'mem', index: 2 },
    };
    expect(atr833Readout(entry, 'en', true)).toBe(
      'Active 118.000 MHz, standby 123.450 MHz, memory 2',
    );
    expect(atr833Readout(entry, 'de', true)).toContain('Standby 123,450 MHz, Speicher 2');
    const empty: Atr833State = { ...start, list: { kind: 'lst', index: 0 } };
    expect(atr833Readout(empty, 'en', true)).toContain('last frequencies 0, empty');
    expect(atr833Readout(empty, 'de', true)).toContain('Letzte Frequenzen 0, leer');
  });

  it('reads off when the install is dark or the unit is switched off', () => {
    expect(atr833Readout(start, 'en', false)).toBe('Off');
    expect(atr833Readout(start, 'de', false)).toBe('Aus');
    expect(atr833Readout({ ...start, on: false }, 'en', true)).toBe('Off');
  });
});

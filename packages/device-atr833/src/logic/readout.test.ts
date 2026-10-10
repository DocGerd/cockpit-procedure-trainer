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

  it('reads dual watch, the chosen item and the saved mark', () => {
    const state: Atr833State = { ...start, dualWatch: true, item: 'ext', saved: true };
    expect(atr833Readout(state, 'en', true)).toBe(
      'Active 118.000 MHz, dual watch 119.000 MHz, saved, external audio off',
    );
    expect(atr833Readout(state, 'de', true)).toBe(
      'Aktiv 118,000 MHz, Doppelhören 119,000 MHz, gespeichert, Externer Eingang aus',
    );
  });

  it('reads a list entry, an empty slot and the save slot', () => {
    const entry: Atr833State = { ...start, memory, list: { kind: 'mem', index: 2 } };
    expect(atr833Readout(entry, 'en', true)).toContain('memory 3, 123.450 MHz');
    expect(atr833Readout(entry, 'de', true)).toContain('Speicher 3, 123,450 MHz');
    const empty: Atr833State = { ...start, list: { kind: 'lst', index: 0 } };
    expect(atr833Readout(empty, 'en', true)).toContain('last frequencies 1, empty');
    expect(atr833Readout(empty, 'de', true)).toContain('Letzte Frequenzen 1, leer');
    const save: Atr833State = { ...start, list: { kind: 'save', index: 4 } };
    expect(atr833Readout(save, 'en', true)).toContain('save to memory 5');
    expect(atr833Readout(save, 'de', true)).toContain('Speichern auf Platz 5');
  });

  it('reads off when the install is dark or the unit is switched off', () => {
    expect(atr833Readout(start, 'en', false)).toBe('Off');
    expect(atr833Readout(start, 'de', false)).toBe('Aus');
    expect(atr833Readout({ ...start, on: false }, 'en', true)).toBe('Off');
  });
});

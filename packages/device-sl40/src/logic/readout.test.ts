import { describe, expect, it } from 'vitest';
import { sl40Device } from './sl40';
import type { Sl40State } from './sl40';
import { sl40Readout } from './readout';

const state: Sl40State = {
  ...(sl40Device.initial as Sl40State),
  active: 118000,
  standby: 121500,
  volume: 0.5,
  monitoring: false,
};

describe('sl40Readout', () => {
  it('reads out both frequencies and the volume', () => {
    expect(sl40Readout(state, 'en', true)).toBe(
      'Active 118.000 MHz, standby 121.500 MHz, volume 50 percent',
    );
    expect(sl40Readout(state, 'de', true)).toBe(
      'Aktiv 118,000 MHz, Standby 121,500 MHz, Lautstärke 50 Prozent',
    );
  });

  it('adds the monitor function while the standby frequency is monitored', () => {
    expect(sl40Readout({ ...state, monitoring: true }, 'en', true)).toBe(
      'Active 118.000 MHz, standby 121.500 MHz, volume 50 percent, monitoring standby',
    );
    expect(sl40Readout({ ...state, monitoring: true }, 'de', true)).toBe(
      'Aktiv 118,000 MHz, Standby 121,500 MHz, Lautstärke 50 Prozent, Standby wird mitgehört',
    );
  });

  it('reports a dark unit as off', () => {
    expect(sl40Readout(state, 'en', false)).toBe('Off');
    expect(sl40Readout(state, 'de', false)).toBe('Aus');
  });
});

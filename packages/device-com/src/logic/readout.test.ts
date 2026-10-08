import { describe, expect, it } from 'vitest';
import { comDevice } from './com';
import type { ComState } from './com';
import { comReadout } from './readout';

const state = { ...(comDevice.initial as ComState), active: 118000, standby: 121500, volume: 0.5 };

describe('comReadout', () => {
  it('reads out both frequencies and the volume in English', () => {
    expect(comReadout(state, 'en', true)).toBe(
      'Active 118.000 MHz, standby 121.500 MHz, volume 50 percent',
    );
  });

  it('reads out both frequencies and the volume in German with decimal commas', () => {
    expect(comReadout(state, 'de', true)).toBe(
      'Aktiv 118,000 MHz, Standby 121,500 MHz, Lautstärke 50 Prozent',
    );
  });

  it('reports a dark unit as off, whatever the stored frequencies', () => {
    expect(comReadout(state, 'en', false)).toBe('Off');
    expect(comReadout(state, 'de', false)).toBe('Aus');
  });
});

import { describe, expect, it } from 'vitest';
import { flarmDevice, type FlarmState } from './flarm';
import { flarmReadout } from './readout';

const base = flarmDevice.initial as FlarmState;
const ready: FlarmState = { ...base, powered: true, stage: 'ready', fix: true, operational: true };

describe('flarmReadout', () => {
  it('reads out the status LEDs once operational', () => {
    expect(flarmReadout(ready, 'en', true)).toBe('Power lit, GPS lit, TX lit, RX dark');
    expect(flarmReadout(ready, 'de', true)).toBe(
      'Power leuchtet, GPS leuchtet, TX leuchtet, RX dunkel',
    );
  });

  it('reads the GPS as searching and TX as dark before the fix', () => {
    const searching = { ...ready, fix: false, operational: false };
    expect(flarmReadout(searching, 'en', true)).toBe('Power lit, GPS searching, TX dark, RX dark');
    expect(flarmReadout(searching, 'de', true)).toBe(
      'Power leuchtet, GPS sucht, TX dunkel, RX dunkel',
    );
  });

  it('reads Power as flashing on a low supply', () => {
    const low = { ...ready, lowSupply: true, operational: false };
    expect(flarmReadout(low, 'en', true)).toBe('Power flashing, GPS lit, TX dark, RX dark');
    expect(flarmReadout(low, 'de', true)).toBe('Power blinkt, GPS leuchtet, TX dunkel, RX dunkel');
  });

  it('reads the self-test', () => {
    const testing = { ...base, powered: true };
    expect(flarmReadout(testing, 'en', true)).toBe('Self-test');
    expect(flarmReadout(testing, 'de', true)).toBe('Selbsttest');
  });

  it('reads a dark unit as off', () => {
    expect(flarmReadout(ready, 'en', false)).toBe('Off');
    expect(flarmReadout(ready, 'de', false)).toBe('Aus');
    expect(flarmReadout(base, 'en', true)).toBe('Off');
  });
});

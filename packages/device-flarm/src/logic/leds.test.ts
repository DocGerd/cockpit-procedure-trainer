import { describe, expect, it } from 'vitest';
import {
  BLINK_MS,
  CONFIRM_STEP_MS,
  SELF_TEST_STEP_MS,
  flarmDevice,
  type FlarmState,
} from './flarm';
import { ledsOf, type Leds } from './leds';

const base = flarmDevice.initial as FlarmState;
const readyState: FlarmState = {
  ...base,
  powered: true,
  stage: 'ready',
  fix: true,
  operational: true,
  clockMs: BLINK_MS,
};

const lit = (leds: Leds): string[] => [
  ...leds.ring.flatMap((on, index) => (on ? [`ring${index}`] : [])),
  ...(leds.above ? ['above'] : []),
  ...(leds.below ? ['below'] : []),
  ...(leds.rx ? ['rx'] : []),
  ...(leds.tx ? ['tx'] : []),
  ...(leds.gps ? ['gps'] : []),
  ...(leds.power ? ['power'] : []),
];

describe('ledsOf', () => {
  it('lights nothing while unpowered', () => {
    expect(lit(ledsOf({ ...readyState, powered: false }))).toEqual([]);
  });

  it('has ten ring LEDs', () => {
    expect(ledsOf(base).ring).toHaveLength(10);
  });

  it('lights one LED at a time through the self-test: ring, above, below, then the status column', () => {
    const states = Array.from({ length: 16 }, (_, step) =>
      lit(
        ledsOf({
          ...base,
          powered: true,
          stage: 'selfTest',
          stageMs: step * SELF_TEST_STEP_MS + 1,
        }),
      ),
    );
    expect(states).toEqual([
      ['ring0'],
      ['ring1'],
      ['ring2'],
      ['ring3'],
      ['ring4'],
      ['ring5'],
      ['ring6'],
      ['ring7'],
      ['ring8'],
      ['ring9'],
      ['above'],
      ['below'],
      ['rx'],
      ['tx'],
      ['gps'],
      ['power'],
    ]);
  });

  describe('ready', () => {
    it('lights Power, GPS and TX with a fix, and leaves the ring, above, below and RX dark', () => {
      expect(lit(ledsOf(readyState))).toEqual(['tx', 'gps', 'power']);
    });

    it('blinks the GPS LED dark briefly each second once the fix is found', () => {
      expect(ledsOf({ ...readyState, clockMs: 0 }).gps).toBe(false);
      expect(ledsOf({ ...readyState, clockMs: BLINK_MS - 1 }).gps).toBe(false);
      expect(ledsOf({ ...readyState, clockMs: BLINK_MS }).gps).toBe(true);
    });

    it('keeps the GPS LED dark with a brief flash each second until the fix', () => {
      const searching = { ...readyState, fix: false, operational: false };
      expect(ledsOf({ ...searching, clockMs: 0 }).gps).toBe(true);
      expect(ledsOf({ ...searching, clockMs: BLINK_MS - 1 }).gps).toBe(true);
      expect(ledsOf({ ...searching, clockMs: BLINK_MS }).gps).toBe(false);
      expect(ledsOf({ ...searching, clockMs: BLINK_MS }).tx).toBe(false);
    });

    it('flashes Power below the supply limit and darkens TX', () => {
      const low = { ...readyState, lowSupply: true, operational: false };
      expect(ledsOf({ ...low, clockMs: 0 }).power).toBe(true);
      expect(ledsOf({ ...low, clockMs: 900 }).power).toBe(false);
      expect(ledsOf(low).tx).toBe(false);
    });
  });

  describe('confirmation run', () => {
    const run = (direction: 'in' | 'out', elapsedMs: number) =>
      lit(ledsOf({ ...readyState, confirm: { direction, elapsedMs } })).filter((led) =>
        led.startsWith('ring'),
      );

    it('runs a pair top to bottom into Nearest', () => {
      expect([0, 1, 2, 3, 4].map((step) => run('in', step * CONFIRM_STEP_MS))).toEqual([
        ['ring0', 'ring9'],
        ['ring1', 'ring8'],
        ['ring2', 'ring7'],
        ['ring3', 'ring6'],
        ['ring4', 'ring5'],
      ]);
    });

    it('runs the pair bottom to top out of it', () => {
      expect([0, 1, 2, 3, 4].map((step) => run('out', step * CONFIRM_STEP_MS))).toEqual([
        ['ring4', 'ring5'],
        ['ring3', 'ring6'],
        ['ring2', 'ring7'],
        ['ring1', 'ring8'],
        ['ring0', 'ring9'],
      ]);
    });

    it('stays on the last pair rather than running past the ring', () => {
      expect(run('in', 100 * CONFIRM_STEP_MS)).toEqual(['ring4', 'ring5']);
    });
  });
});

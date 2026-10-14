import { describe, expect, it } from 'vitest';
import { ledsOf } from './leds';
import {
  ACQUIRE_MS,
  BLINK_PERIOD_MS,
  BRIEF_PUSH_MS,
  CONFIRM_MS,
  LONG_PUSH_MS,
  LOW_SUPPLY_V,
  SELF_TEST_MS,
  SUPPLY_INPUT,
  flarmDevice,
  type FlarmState,
} from './flarm';

type Options = { powered?: boolean; dtMs?: number; volts?: number };

const stepWith = (
  state: FlarmState,
  mode: 'released' | 'pressed' = 'released',
  { powered = true, dtMs = 0, volts = 12 }: Options = {},
) =>
  flarmDevice.step(state, {
    controls: { mode },
    powered,
    inputs: { [SUPPLY_INPUT]: volts },
    dtMs,
  }) as FlarmState;

const start = flarmDevice.initial as FlarmState;

const powerUp = (state: FlarmState = start) => stepWith(state);
const ready = (): FlarmState => stepWith(powerUp(), 'released', { dtMs: SELF_TEST_MS });

/** Press, hold for the given time in advance steps, release. */
const push = (state: FlarmState, heldMs: number, options?: Options): FlarmState => {
  let next = stepWith(state, 'pressed', options);
  for (let elapsed = 0; elapsed < heldMs; elapsed += 100) {
    next = stepWith(next, 'pressed', { ...options, dtMs: Math.min(100, heldMs - elapsed) });
  }
  return stepWith(next, 'released', options);
};

describe('flarmDevice', () => {
  it('declares one momentary Mode key and starts dark', () => {
    expect(Object.keys(flarmDevice.controls)).toEqual(['mode']);
    expect(flarmDevice.controls.mode?.kind).toBe('momentary');
    expect(start).toMatchObject({ powered: false, operational: false, fix: false });
  });

  describe('start-up', () => {
    it('begins the self-test when power arrives, in Nearest at loud volume', () => {
      const state = powerUp();
      expect(state).toMatchObject({
        powered: true,
        stage: 'selfTest',
        volume: 'loud',
        mode: 'nearest',
      });
      expect(stepWith(state, 'released', { dtMs: SELF_TEST_MS - 1 }).stage).toBe('selfTest');
      expect(stepWith(state, 'released', { dtMs: SELF_TEST_MS }).stage).toBe('ready');
    });

    it('does not count the arrival step against the self-test or the search', () => {
      const state = stepWith(start, 'released', { dtMs: 5000 });
      expect(state).toMatchObject({ stageMs: 0, acquiringMs: 0 });
    });

    it('is not operational during the self-test even with a fix', () => {
      const seeded = { ...powerUp(), fix: true };
      expect(stepWith(seeded).operational).toBe(false);
    });

    it('finds its fix after the search, counted from power arriving alongside the self-test', () => {
      let state = powerUp();
      state = stepWith(state, 'released', { dtMs: ACQUIRE_MS - 1 });
      expect(state).toMatchObject({ stage: 'ready', fix: false, operational: false });
      state = stepWith(state, 'released', { dtMs: 1 });
      expect(state).toMatchObject({ fix: true, operational: true });
    });

    it('adds up the search across steps and stops counting at the fix', () => {
      let state = powerUp();
      for (let elapsed = 0; elapsed < ACQUIRE_MS; elapsed += 1000) {
        state = stepWith(state, 'released', { dtMs: 1000 });
      }
      expect(state.fix).toBe(true);
      const settled = state.acquiringMs;
      expect(stepWith(state, 'released', { dtMs: 1000 }).acquiringMs).toBe(settled);
    });

    it('takes a seeded ready state with a fix without a power-up edge', () => {
      const seeded: FlarmState = { ...start, powered: true, stage: 'ready', fix: true };
      expect(stepWith(seeded)).toMatchObject({ stage: 'ready', fix: true, operational: true });
    });
  });

  describe('supply', () => {
    it('flags a supply below the limit and drops operational', () => {
      const state = { ...ready(), fix: true };
      expect(stepWith(state, 'released', { volts: LOW_SUPPLY_V })).toMatchObject({
        lowSupply: false,
        operational: true,
      });
      expect(stepWith(state, 'released', { volts: LOW_SUPPLY_V - 0.1 })).toMatchObject({
        lowSupply: true,
        operational: false,
      });
    });

    it('treats a missing reading as a good supply', () => {
      const state = flarmDevice.step(ready(), {
        controls: { mode: 'released' },
        powered: true,
        inputs: {},
        dtMs: 0,
      }) as FlarmState;
      expect(state.lowSupply).toBe(false);
    });
  });

  describe('Mode key', () => {
    it('steps the volume on a brief push and wraps', () => {
      let state = ready();
      const seen: string[] = [];
      for (let index = 0; index < 4; index += 1) {
        state = push(state, 0);
        seen.push(state.volume);
      }
      expect(seen).toEqual(['medium', 'quiet', 'silent', 'loud']);
      expect(state.confirm).toBeNull();
    });

    it('acts on release, not on press', () => {
      const pressed = stepWith(ready(), 'pressed');
      expect(pressed.volume).toBe('loud');
      expect(stepWith(pressed, 'released').volume).toBe('medium');
    });

    it('treats a push under the brief limit as brief and the limit as a mode swap', () => {
      expect(push(ready(), BRIEF_PUSH_MS - 100)).toMatchObject({
        volume: 'medium',
        mode: 'nearest',
      });
      const swapped = push(ready(), BRIEF_PUSH_MS);
      expect(swapped).toMatchObject({ volume: 'loud', mode: 'collision' });
      expect(swapped.confirm).toEqual({ direction: 'out', elapsedMs: 0 });
    });

    it('swaps back with the confirmation running the other way', () => {
      const back = push(push(ready(), 2000), 2000);
      expect(back.mode).toBe('nearest');
      expect(back.confirm).toEqual({ direction: 'in', elapsedMs: 0 });
    });

    it('does nothing after a push as long as the long limit or longer', () => {
      for (const heldMs of [LONG_PUSH_MS, LONG_PUSH_MS + 3000]) {
        expect(push(ready(), heldMs)).toMatchObject({
          volume: 'loud',
          mode: 'nearest',
          confirm: null,
        });
      }
    });

    it('runs the confirmation down on the clock and clears it', () => {
      let state = push(ready(), 2000);
      state = stepWith(state, 'released', { dtMs: CONFIRM_MS - 1 });
      expect(state.confirm).not.toBeNull();
      state = stepWith(state, 'released', { dtMs: 1 });
      expect(state.confirm).toBeNull();
    });

    it('ignores the key during the self-test', () => {
      const testing = powerUp();
      expect(push(testing, 0)).toMatchObject({ volume: 'loud', stage: 'selfTest' });
      expect(push(testing, SELF_TEST_MS - 600)).toMatchObject({
        mode: 'nearest',
        stage: 'selfTest',
      });
    });

    it('does not fire for a key held through the end of the self-test', () => {
      let held = stepWith(powerUp(), 'pressed');
      held = stepWith(held, 'pressed', { dtMs: SELF_TEST_MS });
      expect(held).toMatchObject({ stage: 'ready', heldMs: 0 });
      expect(stepWith(held, 'released')).toMatchObject({ volume: 'loud', mode: 'nearest' });
    });
  });

  describe('power loss', () => {
    it('goes dark, drops the search and the confirmation, and restarts on the next power', () => {
      const running = push({ ...ready(), fix: true }, 2000);
      const off = stepWith(running, 'released', { powered: false });
      expect(off).toMatchObject({
        powered: false,
        stage: 'selfTest',
        fix: false,
        confirm: null,
        operational: false,
        acquiringMs: 0,
      });
      expect(stepWith(off)).toMatchObject({
        stage: 'selfTest',
        mode: 'nearest',
        volume: 'loud',
        fix: false,
      });
    });

    it('ignores the key while unpowered and records its position', () => {
      const off = stepWith(ready(), 'pressed', { powered: false });
      expect(off.held).toBe('pressed');
      expect(off.volume).toBe('loud');
    });

    it('does not fire for a key held through power-up', () => {
      let state = stepWith(stepWith(start, 'pressed', { powered: false }), 'pressed');
      state = stepWith(state, 'pressed', { dtMs: SELF_TEST_MS });
      expect(stepWith(state, 'released')).toMatchObject({ volume: 'loud', mode: 'nearest' });
    });
  });

  describe('power cycle', () => {
    const lost = (state: FlarmState, mode: 'released' | 'pressed' = 'released') =>
      stepWith(state, mode, { powered: false });

    it('pull and push back in flight: dark, then the whole start-up again with the defaults', () => {
      let state = push({ ...ready(), fix: true }, 100);
      state = push(state, 2000);
      expect(state).toMatchObject({ volume: 'medium', mode: 'collision', operational: true });

      const pulled = lost(state);
      expect(ledsOf(pulled)).toEqual(ledsOf(start));
      expect(ledsOf(pulled).power).toBe(false);

      const back = stepWith(pulled);
      expect(back).toMatchObject({
        powered: true,
        stage: 'selfTest',
        stageMs: 0,
        volume: 'loud',
        mode: 'nearest',
        fix: false,
        operational: false,
      });
      expect(ledsOf(back).ring[0]).toBe(true);

      const tested = stepWith(back, 'released', { dtMs: SELF_TEST_MS });
      expect(tested).toMatchObject({ stage: 'ready', operational: false });
      expect(ledsOf(tested).tx).toBe(false);
      expect(stepWith(tested, 'released', { dtMs: ACQUIRE_MS })).toMatchObject({
        fix: true,
        operational: true,
      });
    });

    it('pull mid self-test: the test begins again at its first LED and a key held through it is ignored', () => {
      let state = stepWith(powerUp(), 'released', { dtMs: SELF_TEST_MS / 2 });
      expect(state.stage).toBe('selfTest');
      expect(state.stageMs).toBeGreaterThan(0);

      state = stepWith(lost(state, 'pressed'), 'pressed');
      expect(state).toMatchObject({ stage: 'selfTest', stageMs: 0 });
      expect(ledsOf(state).ring[0]).toBe(true);

      state = stepWith(state, 'pressed', { dtMs: SELF_TEST_MS });
      expect(state.stage).toBe('ready');
      expect(stepWith(state, 'released')).toMatchObject({ volume: 'loud', mode: 'nearest' });
    });

    it('pull during the mode-swap confirmation drops the run and the new mode', () => {
      const swapping = push({ ...ready(), fix: true }, 2000);
      expect(swapping.confirm).not.toBeNull();
      const back = stepWith(lost(swapping));
      expect(back).toMatchObject({ confirm: null, mode: 'nearest' });
      expect(ledsOf(stepWith(back, 'released', { dtMs: SELF_TEST_MS })).ring).not.toContain(true);
    });

    it('pull during the GPS search: the search restarts from nothing', () => {
      const searching = stepWith(ready(), 'released', { dtMs: ACQUIRE_MS - SELF_TEST_MS - 500 });
      expect(searching.fix).toBe(false);
      const back = stepWith(lost(searching));
      expect(back.acquiringMs).toBe(0);
      expect(stepWith(back, 'released', { dtMs: ACQUIRE_MS - 1 }).fix).toBe(false);
      expect(stepWith(back, 'released', { dtMs: ACQUIRE_MS }).fix).toBe(true);
    });

    it('a pull that outlasts one step and one that does not both end in a fresh start', () => {
      const running = { ...ready(), fix: true };
      for (const steps of [1, 5]) {
        let state = running;
        for (let index = 0; index < steps; index++) state = lost(state);
        expect(stepWith(state)).toMatchObject({ stage: 'selfTest', fix: false });
      }
    });

    it('comes back with a low supply flagged and not operational until the supply recovers', () => {
      const back = stepWith(lost(ready()), 'released', { volts: LOW_SUPPLY_V - 1 });
      expect(back).toMatchObject({ lowSupply: true, operational: false });
      const recovered = stepWith(back, 'released', { dtMs: SELF_TEST_MS + ACQUIRE_MS });
      expect(recovered).toMatchObject({ lowSupply: false, operational: true });
    });
  });

  it('keeps a blink clock that wraps each period', () => {
    const state = stepWith(powerUp(), 'released', { dtMs: BLINK_PERIOD_MS + 300 });
    expect(state.clockMs).toBe(300);
  });
});

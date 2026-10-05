import { describe, expect, it } from 'vitest';
import { pistonEngineStart as createPistonEngineStart } from './piston-engine-start';
import type { PistonEngineInputs, PistonEngineState } from './piston-engine-start';

const CRANK_MS_TO_START = 700;
const pistonEngineStart = createPistonEngineStart({ crankMsToStart: CRANK_MS_TO_START });

const inputs = (overrides: Partial<PistonEngineInputs> = {}): PistonEngineInputs => ({
  starterEngaged: true,
  magnetos: 'both',
  busPowered: true,
  engineFailed: false,
  ...overrides,
});

const run = (
  from: PistonEngineState,
  overrides: Partial<PistonEngineInputs>,
  totalMs: number,
  dtMs = 100,
): PistonEngineState => {
  let state = from;
  for (let elapsed = 0; elapsed < totalMs; elapsed += dtMs) {
    state = pistonEngineStart.step(state, inputs(overrides), dtMs);
  }
  return state;
};

const crankedLongEnough = CRANK_MS_TO_START + 100;

describe('pistonEngineStart', () => {
  it('starts stopped', () => {
    expect(pistonEngineStart.initial).toEqual({ running: false, crankMs: 0 });
  });

  it('does not start with the magnetos off', () => {
    const state = run(pistonEngineStart.initial, { magnetos: 'off' }, crankedLongEnough * 3);
    expect(state).toEqual(pistonEngineStart.initial);
  });

  it('does nothing when the starter is engaged without bus power', () => {
    const state = run(pistonEngineStart.initial, { busPowered: false }, crankedLongEnough * 3);
    expect(state).toEqual(pistonEngineStart.initial);
  });

  it('keeps running after the starter is released', () => {
    const started = run(pistonEngineStart.initial, {}, crankedLongEnough);
    expect(started.running).toBe(true);
    const released = run(started, { starterEngaged: false }, crankedLongEnough);
    expect(released.running).toBe(true);
  });

  it('keeps running without bus power once started', () => {
    const started = run(pistonEngineStart.initial, {}, crankedLongEnough);
    expect(run(started, { starterEngaged: false, busPowered: false }, 1000).running).toBe(true);
  });

  it('catches only after the starter has cranked over successive steps', () => {
    const cranking = pistonEngineStart.step(
      pistonEngineStart.initial,
      inputs(),
      CRANK_MS_TO_START - 1,
    );
    expect(cranking).toEqual({ running: false, crankMs: CRANK_MS_TO_START - 1 });
    expect(pistonEngineStart.step(cranking, inputs(), 1).running).toBe(true);
  });

  it('loses crank progress when the starter is released early', () => {
    const partial = run(pistonEngineStart.initial, {}, CRANK_MS_TO_START / 2);
    expect(partial.crankMs).toBeGreaterThan(0);
    const released = pistonEngineStart.step(partial, inputs({ starterEngaged: false }), 100);
    expect(released).toEqual({ running: false, crankMs: 0 });
  });

  it('loses crank progress when bus power drops mid-crank', () => {
    const partial = run(pistonEngineStart.initial, {}, CRANK_MS_TO_START / 2);
    expect(partial.crankMs).toBeGreaterThan(0);
    const dropped = pistonEngineStart.step(partial, inputs({ busPowered: false }), 100);
    expect(dropped).toEqual({ running: false, crankMs: 0 });
  });

  it('loses crank progress when the magnetos go off mid-crank', () => {
    const partial = run(pistonEngineStart.initial, {}, CRANK_MS_TO_START / 2);
    expect(partial.crankMs).toBeGreaterThan(0);
    const off = pistonEngineStart.step(partial, inputs({ magnetos: 'off' }), 100);
    expect(off).toEqual({ running: false, crankMs: 0 });
  });

  it('takes its crank time from the aircraft config', () => {
    const slow = createPistonEngineStart({ crankMsToStart: 2000 });
    const state = slow.step(slow.initial, inputs(), CRANK_MS_TO_START + 100);
    expect(state.running).toBe(false);
    expect(slow.step(state, inputs(), 2000).running).toBe(true);
  });

  it('does not mutate its state or inputs', () => {
    const state = Object.freeze({ ...pistonEngineStart.initial });
    const frozen = Object.freeze(inputs());
    expect(() => pistonEngineStart.step(state, frozen, 100)).not.toThrow();
  });

  it.each(['left', 'right', 'both'] as const)('starts on the %s magneto', (magnetos) => {
    expect(run(pistonEngineStart.initial, { magnetos }, crankedLongEnough).running).toBe(true);
  });

  it('stops when the magnetos are switched off', () => {
    const started = run(pistonEngineStart.initial, {}, crankedLongEnough);
    const stopped = pistonEngineStart.step(
      started,
      inputs({ starterEngaged: false, magnetos: 'off' }),
      100,
    );
    expect(stopped.running).toBe(false);
  });

  it('stops on an engine failure and does not restart while it is active', () => {
    const started = run(pistonEngineStart.initial, {}, crankedLongEnough);
    const failed = pistonEngineStart.step(started, inputs({ engineFailed: true }), 100);
    expect(failed).toEqual({ running: false, crankMs: 0 });
    expect(run(failed, { engineFailed: true }, crankedLongEnough * 3).running).toBe(false);
  });

  it('does not accumulate crank time while running', () => {
    const started = run(pistonEngineStart.initial, {}, crankedLongEnough);
    expect(run(started, {}, 1000).crankMs).toBe(0);
  });
});

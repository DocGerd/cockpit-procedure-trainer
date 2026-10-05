import type { SystemBlock } from './types';

export const CRANK_MS_TO_START = 1000;

export type Magnetos = 'off' | 'left' | 'right' | 'both';

export type PistonEngineState = {
  running: boolean;
  crankMs: number;
};

export type PistonEngineInputs = {
  starterEngaged: boolean;
  magnetos: Magnetos;
  busPowered: boolean;
  engineFailed: boolean;
};

export const pistonEngineStart: SystemBlock<PistonEngineState, PistonEngineInputs> = {
  initial: { running: false, crankMs: 0 },
  step(state, { starterEngaged, magnetos, busPowered, engineFailed }, dtMs) {
    const ignition = magnetos !== 'off' && !engineFailed;
    if (!ignition) return { running: false, crankMs: 0 };
    if (state.running) return { running: true, crankMs: 0 };
    if (!starterEngaged || !busPowered) return { running: false, crankMs: 0 };
    const crankMs = state.crankMs + dtMs;
    return crankMs >= CRANK_MS_TO_START
      ? { running: true, crankMs: 0 }
      : { running: false, crankMs };
  },
};

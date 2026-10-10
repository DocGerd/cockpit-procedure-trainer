import {
  BLINK_MS,
  BLINK_PERIOD_MS,
  CONFIRM_STEPS,
  CONFIRM_STEP_MS,
  RING_LEDS,
  SELF_TEST_STEP_MS,
  type FlarmState,
} from './flarm';

export type Leds = {
  /** Clockwise from the first LED, just right of the nose, to the last, just left of it. */
  readonly ring: readonly boolean[];
  readonly above: boolean;
  readonly below: boolean;
  readonly rx: boolean;
  readonly tx: boolean;
  readonly gps: boolean;
  readonly power: boolean;
};

const RING_STEPS = RING_LEDS;
const ABOVE_STEP = RING_STEPS;
const BELOW_STEP = RING_STEPS + 1;
const RX_STEP = RING_STEPS + 2;
const TX_STEP = RING_STEPS + 3;
const GPS_STEP = RING_STEPS + 4;
const POWER_STEP = RING_STEPS + 5;
const HALF_PERIOD_MS = BLINK_PERIOD_MS / 2;

const dark: Leds = {
  ring: Array.from({ length: RING_LEDS }, () => false),
  above: false,
  below: false,
  rx: false,
  tx: false,
  gps: false,
  power: false,
};

/** Which LEDs of the face are lit for a state: the ring only during the self-test and the confirmation. */
export function ledsOf(state: FlarmState): Leds {
  if (!state.powered) return dark;

  if (state.stage === 'selfTest') {
    const step = Math.floor(state.stageMs / SELF_TEST_STEP_MS);
    return {
      ring: dark.ring.map((_, index) => index === step),
      above: step === ABOVE_STEP,
      below: step === BELOW_STEP,
      rx: step === RX_STEP,
      tx: step === TX_STEP,
      gps: step === GPS_STEP,
      power: step === POWER_STEP,
    };
  }

  const blinking = state.clockMs < BLINK_MS;
  const { confirm } = state;
  const ring = dark.ring.map(() => false);
  if (confirm !== null) {
    const step = Math.min(Math.floor(confirm.elapsedMs / CONFIRM_STEP_MS), CONFIRM_STEPS - 1);
    const row = confirm.direction === 'in' ? step : CONFIRM_STEPS - 1 - step;
    ring[row] = true;
    ring[RING_LEDS - 1 - row] = true;
  }
  return {
    ring,
    above: false,
    below: false,
    rx: false,
    tx: state.operational,
    gps: state.fix ? !blinking : blinking,
    power: state.lowSupply ? state.clockMs < HALF_PERIOD_MS : true,
  };
}

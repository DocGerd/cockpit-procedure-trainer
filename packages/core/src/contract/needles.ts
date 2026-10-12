import type { NeedleHand } from './types';

/** The clockwise angle in degrees from upright at which a hand shows `value`. */
export function handAngle(hand: NeedleHand, value: number): number {
  const turns = value / hand.valuePerTurn;
  return Number.isFinite(turns) ? Math.round(turns * 360 * 1e9) / 1e9 : 0;
}

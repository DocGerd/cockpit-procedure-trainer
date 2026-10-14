import { describe, expect, it } from 'vitest';
import { handAngle } from './needles';

const hand = (valuePerTurn: number) => ({ image: 'h.svg', pivot: { x: 0, y: 0 }, valuePerTurn });

describe('handAngle', () => {
  it('turns a hand clockwise by 360° per valuePerTurn', () => {
    expect(handAngle(hand(1000), 0)).toBe(0);
    expect(handAngle(hand(1000), 250)).toBe(90);
    expect(handAngle(hand(10_000), 2500)).toBe(90);
  });

  it('drives hands of different scales from one value', () => {
    const value = 1350;
    expect([1000, 10_000, 100_000].map((perTurn) => handAngle(hand(perTurn), value))).toEqual([
      486, 48.6, 4.86,
    ]);
  });

  it('has no stop: it goes on round past a full turn and back past zero', () => {
    expect(handAngle(hand(1000), 2250)).toBe(810);
    expect(handAngle(hand(1000), -250)).toBe(-90);
  });

  it('turns a hand with a negative valuePerTurn counter-clockwise', () => {
    expect(handAngle(hand(-1000), 250)).toBe(-90);
  });

  it('gives no angle for a value it cannot read, rather than a believable upright hand', () => {
    expect(handAngle(hand(1000), Number.NaN)).toBeNaN();
    expect(handAngle(hand(0), 100)).toBeNaN();
  });
});

import { describe, expect, it } from 'vitest';
import { IN_SLOT_OPERATION, slotMode } from './slot-mode';

const floor = { width: 480, height: 228 };

describe('slotMode', () => {
  it('is operable when the floor fits the slot on both axes and the option is on', () => {
    expect(slotMode({ width: 480, height: 228 }, floor, true)).toBe('operable');
    expect(slotMode({ width: 1000, height: 500 }, floor, true)).toBe('operable');
  });

  it('mirrors when the floor does not fit on either axis, even with the option on', () => {
    expect(slotMode({ width: 479, height: 500 }, floor, true)).toBe('mirror');
    expect(slotMode({ width: 1000, height: 227 }, floor, true)).toBe('mirror');
    expect(slotMode({ width: 0, height: 0 }, floor, true)).toBe('mirror');
  });

  it('mirrors with the option off, however large the slot', () => {
    expect(slotMode({ width: 4000, height: 4000 }, floor, false)).toBe('mirror');
  });

  it('ships with the option off', () => {
    expect(IN_SLOT_OPERATION).toBe(false);
  });
});

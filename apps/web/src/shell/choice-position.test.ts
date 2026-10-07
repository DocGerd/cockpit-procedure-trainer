import { describe, expect, it } from 'vitest';
import { choosePlacement } from './choice-position';

describe('choosePlacement', () => {
  it('aligns the dialog to the chip start when it fits', () => {
    expect(choosePlacement({ left: 100, right: 180 }, 300, 1000, 24)).toBe('start');
  });

  it('aligns the dialog to the chip end when the start side overflows', () => {
    expect(choosePlacement({ left: 800, right: 880 }, 300, 1000, 24)).toBe('end');
  });

  it('falls back to the header edge when neither chip edge fits', () => {
    expect(choosePlacement({ left: 400, right: 480 }, 600, 700, 24)).toBe('header');
  });

  it('keeps the margin on the start side', () => {
    expect(choosePlacement({ left: 100, right: 180 }, 880, 1000, 24)).toBe('header');
  });
});

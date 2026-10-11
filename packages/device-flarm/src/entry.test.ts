import { describe, expect, it } from 'vitest';
import { flarmScreenEntry } from './entry';

describe('flarmScreenEntry', () => {
  it('draws its own face, with no frame bezel around it', () => {
    expect(flarmScreenEntry.face).toBe('own');
  });

  it('keeps the dock frame at the natural face plus the plate margin', () => {
    expect(flarmScreenEntry.floor).toEqual({ width: 364, height: 213 });
  });
});

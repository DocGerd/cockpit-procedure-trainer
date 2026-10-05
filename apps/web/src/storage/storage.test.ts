// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readSetting, writeSetting } from './index';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('settings storage', () => {
  it('reads back what it wrote', () => {
    writeSetting('theme', 'dark');
    expect(readSetting('theme')).toBe('dark');
  });

  it('reads a setting never written as absent', () => {
    expect(readSetting('language')).toBeUndefined();
  });

  it('keeps the settings apart', () => {
    writeSetting('aircraft', 'alpha');
    expect(readSetting('theme')).toBeUndefined();
    expect(readSetting('aircraft')).toBe('alpha');
  });

  it('reads as absent and writes nothing when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => writeSetting('theme', 'dark')).not.toThrow();
    expect(readSetting('theme')).toBeUndefined();
  });

  it('reads as absent when localStorage itself cannot be reached', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => writeSetting('aircraft', 'alpha')).not.toThrow();
    expect(readSetting('aircraft')).toBeUndefined();
  });
});

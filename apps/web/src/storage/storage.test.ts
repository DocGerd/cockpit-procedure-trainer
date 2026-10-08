// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readHistory, readSetting, recordRun, writeSetting } from './index';

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

describe('run history', () => {
  const run = (deviations: number, at: number, mode: 'guided' | 'practice' = 'guided') => ({
    mode,
    deviations,
    at,
  });

  it('is empty for an aircraft that has no runs', () => {
    expect(readHistory('alpha')).toEqual({});
  });

  it('reads back the last run and the best run per procedure', () => {
    recordRun('alpha', 'start', run(3, 100));
    recordRun('alpha', 'start', run(1, 200, 'practice'));
    recordRun('alpha', 'start', run(2, 300));
    expect(readHistory('alpha')).toEqual({
      start: { last: run(2, 300), best: run(1, 200, 'practice') },
    });
  });

  it('keeps the date of the first run that reached the best count', () => {
    recordRun('alpha', 'start', run(0, 100));
    recordRun('alpha', 'start', run(0, 200));
    expect(readHistory('alpha')['start']?.best.at).toBe(100);
  });

  it('keeps aircraft and procedures apart', () => {
    recordRun('alpha', 'start', run(1, 100));
    recordRun('alpha', 'fire', run(2, 100));
    recordRun('bravo', 'start', run(3, 100));
    expect(Object.keys(readHistory('alpha')).sort()).toEqual(['fire', 'start']);
    expect(readHistory('bravo')['start']?.last.deviations).toBe(3);
  });

  it.each([
    ['not JSON', '{nope'],
    ['not an object', '[1,2]'],
    ['a null', 'null'],
    ['an aircraft that is not an object', '{"alpha":5}'],
  ])('reads as empty when the stored history is %s', (_name, raw) => {
    localStorage.setItem('cpt.history', raw);
    expect(readHistory('alpha')).toEqual({});
  });

  it('drops entries that are malformed and keeps the valid ones', () => {
    const good = { last: run(1, 100), best: run(1, 100) };
    localStorage.setItem(
      'cpt.history',
      JSON.stringify({
        alpha: {
          good,
          negative: { last: run(-1, 100), best: run(0, 100) },
          fractional: { last: run(1.5, 100), best: run(1, 100) },
          badMode: { last: { mode: 'explore', deviations: 1, at: 1 }, best: run(1, 1) },
          noBest: { last: run(1, 100) },
          text: { last: run(1, 100), best: { mode: 'guided', deviations: '0', at: 1 } },
        },
      }),
    );
    expect(readHistory('alpha')).toEqual({ good });
  });

  it('starts over from corrupt storage when recording', () => {
    localStorage.setItem('cpt.history', '{nope');
    recordRun('alpha', 'start', run(1, 100));
    expect(readHistory('alpha')['start']?.last).toEqual(run(1, 100));
  });

  it('reads as empty and records nothing when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => recordRun('alpha', 'start', run(1, 100))).not.toThrow();
    expect(readHistory('alpha')).toEqual({});
  });

  it('does not let a name reach the object prototype', () => {
    expect(readHistory('alpha')['constructor']).toBeUndefined();
    expect(readHistory('toString')).toEqual({});
  });
});

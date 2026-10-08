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
    recordRun('alpha', 'start', run(0, 100, 'practice'));
    recordRun('alpha', 'start', run(0, 200, 'practice'));
    expect(readHistory('alpha')['start']?.best?.at).toBe(100);
  });

  it('counts only Practice runs as best, since Guided shows the next control', () => {
    recordRun('alpha', 'start', run(0, 100));
    expect(readHistory('alpha')).toEqual({ start: { last: run(0, 100) } });
    recordRun('alpha', 'start', run(2, 200, 'practice'));
    recordRun('alpha', 'start', run(0, 300));
    expect(readHistory('alpha')).toEqual({
      start: { last: run(0, 300), best: run(2, 200, 'practice') },
    });
  });

  it('still loads a stored record whose best is a Guided run, without that best', () => {
    localStorage.setItem(
      'cpt.history',
      JSON.stringify({
        alpha: {
          start: { last: run(2, 200, 'practice'), best: run(0, 100) },
          fire: { last: run(1, 300), best: run(1, 300, 'practice') },
        },
      }),
    );
    expect(readHistory('alpha')).toEqual({
      start: { last: run(2, 200, 'practice') },
      fire: { last: run(1, 300), best: run(1, 300, 'practice') },
    });
    recordRun('alpha', 'start', run(3, 400, 'practice'));
    expect(readHistory('alpha')['start']?.best).toEqual(run(3, 400, 'practice'));
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
    const good = { last: run(1, 100), best: run(1, 100, 'practice') };
    localStorage.setItem(
      'cpt.history',
      JSON.stringify({
        alpha: {
          good,
          negative: { last: run(-1, 100), best: run(0, 100) },
          fractional: { last: run(1.5, 100), best: run(1, 100) },
          badMode: { last: { mode: 'explore', deviations: 1, at: 1 }, best: run(1, 1) },
          hugeDate: { last: run(1, 1e308), best: run(1, 100) },
          beyondDate: { last: run(1, 8.64e15 + 1), best: run(1, 100) },
          text: { last: { mode: 'guided', deviations: '0', at: 1 }, best: run(1, 100) },
          noBest: { last: run(1, 100) },
          badBest: { last: run(1, 100), best: { mode: 'practice', deviations: '0', at: 1 } },
        },
      }),
    );
    expect(readHistory('alpha')).toEqual({
      good,
      noBest: { last: run(1, 100) },
      badBest: { last: run(1, 100) },
    });
  });

  it('trims a stored map that is larger than the history ever grows', () => {
    const entry = { last: run(1, 100), best: run(1, 100) };
    const procedures = (count: number) =>
      Object.fromEntries(Array.from({ length: count }, (_, index) => [`p${index}`, entry]));
    const aircraft = Object.fromEntries(
      Array.from({ length: 500 }, (_, index) => [`a${index}`, procedures(2)]),
    );
    localStorage.setItem(
      'cpt.history',
      JSON.stringify({
        ...aircraft,
        [`long${'x'.repeat(100)}`]: procedures(1),
        big: procedures(1000),
      }),
    );
    recordRun('fresh', 'start', run(0, 200));
    const stored = JSON.parse(localStorage.getItem('cpt.history') ?? '{}') as Record<
      string,
      object
    >;
    expect(Object.keys(stored).length).toBeLessThanOrEqual(32);
    expect(Object.keys(stored)).toContain('fresh');
    expect(Object.keys(stored).every((name) => name.length <= 64)).toBe(true);
    expect(Object.keys(readHistory('big')).length).toBeLessThanOrEqual(128);
  });

  it('evicts the least recently run procedure when an aircraft is full', () => {
    for (let index = 0; index < 129; index += 1) recordRun('alpha', `p${index}`, run(0, index));
    recordRun('alpha', 'p1', run(0, 500));
    recordRun('alpha', 'extra', run(0, 600));
    const names = Object.keys(readHistory('alpha'));
    expect(names).toHaveLength(128);
    expect(names).not.toContain('p0');
    expect(names).not.toContain('p2');
    expect(names).toContain('p1');
    expect(names).toContain('extra');
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

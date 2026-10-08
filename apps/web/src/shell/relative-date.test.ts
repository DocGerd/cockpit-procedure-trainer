import { describe, expect, it } from 'vitest';
import { relativeDate } from './relative-date';

const now = new Date(2026, 9, 8, 15, 30).getTime();
const ago = (days: number, hour = 9) => new Date(2026, 9, 8 - days, hour).getTime();

describe('relativeDate', () => {
  it.each([
    [ago(0, 8), 'en', 'today'],
    [ago(1, 23), 'en', 'yesterday'],
    [ago(3), 'en', '3 days ago'],
    [ago(6), 'en', '6 days ago'],
    [ago(7), 'en', 'last week'],
    [ago(20), 'en', '2 weeks ago'],
    [ago(60), 'en', '2 months ago'],
    [ago(400), 'en', 'last year'],
    [ago(800), 'en', '2 years ago'],
    [ago(0, 8), 'de', 'heute'],
    [ago(1), 'de', 'gestern'],
    [ago(3), 'de', 'vor 3 Tagen'],
    [ago(14), 'de', 'vor 2 Wochen'],
  ] as const)('formats %s in %s as "%s"', (then, language, expected) => {
    expect(relativeDate(then, now, language)).toBe(expected);
  });

  it('counts calendar days, not 24-hour spans', () => {
    const lateEvening = new Date(2026, 9, 7, 23, 59).getTime();
    const earlyMorning = new Date(2026, 9, 8, 0, 1).getTime();
    expect(relativeDate(lateEvening, earlyMorning, 'en')).toBe('yesterday');
  });

  it('reads a date in the future as today', () => {
    expect(relativeDate(ago(-2), now, 'en')).toBe('today');
  });
});

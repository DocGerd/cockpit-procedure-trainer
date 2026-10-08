import type { Language } from '../i18n';

const dayStart = (time: number) => {
  const date = new Date(time);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

export function relativeDate(then: number, now: number, language: Language): string {
  const days = Math.max(0, Math.round((dayStart(now) - dayStart(then)) / 86_400_000));
  const format = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  if (days < 7) return format.format(-days, 'day');
  if (days < 30) return format.format(-Math.floor(days / 7), 'week');
  if (days < 365) return format.format(-Math.floor(days / 30), 'month');
  return format.format(-Math.floor(days / 365), 'year');
}

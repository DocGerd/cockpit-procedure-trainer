import type { Text } from '@cpt/core';
import type { Gtx327State } from './gtx327';

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const CODE_LENGTH = 4;
const TEST_PATTERN = '8888';

const pad = (value: number): string => String(value).padStart(2, '0');

export function formatTimer(ms: number): string {
  const total = Math.floor(ms / MS_PER_SECOND);
  const seconds = total % SECONDS_PER_MINUTE;
  const minutes = Math.floor(total / SECONDS_PER_MINUTE) % MINUTES_PER_HOUR;
  const hours = Math.floor(total / (SECONDS_PER_MINUTE * MINUTES_PER_HOUR));
  return `${hours}:${pad(minutes)}:${pad(seconds)}`;
}

export function codeText({ mode, entry, squawk }: Gtx327State): string {
  if (mode === 'tst') return TEST_PATTERN;
  return entry === '' ? squawk : entry.padEnd(CODE_LENGTH, '_');
}

export function readingText(state: Gtx327State): string {
  if (state.page === 'countUp') return formatTimer(state.timerMs);
  return state.altitude === null ? '' : `${Math.round(state.altitude)} FT`;
}

export function gtx327Readout(state: unknown, language: keyof Text, on: boolean): string {
  const unit = state as Gtx327State;
  const de = language === 'de';
  if (!on || unit.mode === 'off') return de ? 'Aus' : 'Off';
  const parts = de
    ? [`Modus ${unit.mode.toUpperCase()}`, `Code ${codeText(unit)}`]
    : [`Mode ${unit.mode.toUpperCase()}`, `code ${codeText(unit)}`];
  if (unit.page === 'countUp') {
    parts.push(`${de ? 'Zeitgeber' : 'timer'} ${formatTimer(unit.timerMs)}`);
  } else if (unit.altitude !== null) {
    parts.push(`${Math.round(unit.altitude)} ${de ? 'Fuß' : 'feet'}`);
  }
  if (unit.ident) parts.push(de ? 'Ident' : 'ident');
  return parts.join(', ');
}

import type { Text } from '@cpt/core';
import { formatFrequency } from './com';
import type { ComState } from './com';

const PERCENT = 100;

export function comReadout(state: unknown, language: keyof Text, on: boolean): string {
  const { active, standby, volume } = state as ComState;
  const percent = Math.round(volume * PERCENT);
  const mhz = (khz: number) => formatFrequency(khz).replace('.', language === 'de' ? ',' : '.');
  if (!on) return language === 'de' ? 'Aus' : 'Off';
  return language === 'de'
    ? `Aktiv ${mhz(active)} MHz, Standby ${mhz(standby)} MHz, Lautstärke ${percent} Prozent`
    : `Active ${mhz(active)} MHz, standby ${mhz(standby)} MHz, volume ${percent} percent`;
}

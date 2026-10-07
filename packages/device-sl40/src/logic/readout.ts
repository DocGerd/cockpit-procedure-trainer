import type { Text } from '@cpt/core';
import { formatFrequency } from './sl40';
import type { Sl40State } from './sl40';

const PERCENT = 100;

export function sl40Readout(state: unknown, language: keyof Text, on: boolean): string {
  const { active, standby, volume, monitoring } = state as Sl40State;
  const de = language === 'de';
  if (!on) return de ? 'Aus' : 'Off';
  const percent = Math.round(volume * PERCENT);
  const mhz = (khz: number) => formatFrequency(khz).replace('.', de ? ',' : '.');
  const base = de
    ? `Aktiv ${mhz(active)} MHz, Standby ${mhz(standby)} MHz, Lautstärke ${percent} Prozent`
    : `Active ${mhz(active)} MHz, standby ${mhz(standby)} MHz, volume ${percent} percent`;
  if (!monitoring) return base;
  return de ? `${base}, Standby wird mitgehört` : `${base}, monitoring standby`;
}

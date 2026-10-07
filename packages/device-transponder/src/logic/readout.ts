import type { Text } from '@cpt/core';
import type { TransponderState } from './transponder';

export function transponderReadout(state: unknown, language: keyof Text, on: boolean): string {
  const { mode, squawk, altitude, ident } = state as TransponderState;
  const de = language === 'de';
  if (!on || mode === 'off') return de ? 'Aus' : 'Off';
  const parts = de
    ? [`Modus ${mode.toUpperCase()}`, `Code ${squawk}`]
    : [`Mode ${mode.toUpperCase()}`, `code ${squawk}`];
  if (altitude !== null) {
    parts.push(de ? `Höhe ${Math.round(altitude)} Fuß` : `altitude ${Math.round(altitude)} feet`);
  }
  if (ident) parts.push(de ? 'Ident' : 'ident');
  return parts.join(', ');
}

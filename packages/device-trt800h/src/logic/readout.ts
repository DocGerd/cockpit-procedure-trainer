import type { Text } from '@cpt/core';
import type { Trt800hState } from './trt800h';

const LEVEL_DIGITS = 3;

export function modeText({ mode }: Trt800hState): string {
  if (mode === 'acs') return 'ACS';
  return mode === 'as' ? 'A-S' : '';
}

export function levelText({ flightLevel }: Trt800hState): string {
  if (flightLevel === null) return 'FLerr';
  const digits = String(Math.abs(flightLevel)).padStart(LEVEL_DIGITS, '0');
  return flightLevel < 0 ? `FL -${digits.slice(1)}` : `FL ${digits}`;
}

export function bottomRightText({ storedMs, vfrShown, standby }: Trt800hState): string {
  if (storedMs > 0) return 'S';
  return vfrShown ? 'VFR' : standby;
}

export function trt800hReadout(state: unknown, language: keyof Text, on: boolean): string {
  const unit = state as Trt800hState;
  const de = language === 'de';
  if (!on || !unit.on) return de ? 'Aus' : 'Off';
  const standbyMode = de ? 'Standby' : 'standby';
  const mode = unit.mode === 'stby' ? standbyMode : modeText(unit);
  const level = unit.flightLevel === null ? (de ? 'FL-Fehler' : 'FL error') : levelText(unit);
  const parts = [
    de ? `Modus ${mode}` : `Mode ${mode}`,
    `${de ? 'Code' : 'code'} ${unit.squawk}`,
    level,
  ];
  if (unit.identMs > 0) parts.push(de ? 'Ident' : 'ident');
  if (unit.vfrShown) parts.push(de ? 'VFR angezeigt' : 'VFR shown');
  else {
    parts.push(`${de ? 'Bereitschaftscode' : 'standby code'} ${unit.standby}`);
    if (unit.cursor !== null) parts.push(`${de ? 'Ziffer' : 'digit'} ${unit.cursor + 1}`);
  }
  return parts.join(', ');
}

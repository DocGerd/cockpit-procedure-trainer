import type { Text } from '@cpt/core';
import type { FlarmState } from './flarm';

export function flarmReadout(state: unknown, language: keyof Text, on: boolean): string {
  const { powered, stage, fix, operational, lowSupply } = state as FlarmState;
  const de = language === 'de';
  if (!on || !powered) return de ? 'Aus' : 'Off';
  if (stage === 'selfTest') return de ? 'Selbsttest' : 'Self-test';
  const lit = de ? 'leuchtet' : 'lit';
  const dim = de ? 'dunkel' : 'dark';
  return [
    `Power ${lowSupply ? (de ? 'blinkt' : 'flashing') : lit}`,
    `GPS ${fix ? lit : de ? 'sucht' : 'searching'}`,
    `TX ${operational ? lit : dim}`,
    `RX ${dim}`,
  ].join(', ');
}

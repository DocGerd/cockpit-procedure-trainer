import type { Text } from '@cpt/core';
import { formatFrequency, listEntry } from './atr833';
import type { Atr833Item, Atr833State } from './atr833';

const ITEM_NAMES: Readonly<Record<Atr833Item, Text>> = {
  vol: { de: 'Lautstärke', en: 'volume' },
  sql: { de: 'Squelch', en: 'squelch' },
  dim: { de: 'Helligkeit', en: 'brightness' },
  vox: { de: 'VOX', en: 'VOX' },
  dwm: { de: 'DWM', en: 'DWM' },
  int: { de: 'INT', en: 'INT' },
  ext: { de: 'EXT', en: 'EXT' },
};

const LIST_NAMES = {
  mem: { de: 'Speicher', en: 'memory' },
  lst: { de: 'Letzte Frequenzen', en: 'last frequencies' },
} as const;

const mhz = (khz: number, language: keyof Text): string =>
  `${formatFrequency(khz).replace('.', language === 'de' ? ',' : '.')} MHz`;

function lineThree(state: Atr833State, language: keyof Text): string {
  const { list } = state;
  if (list !== null) {
    const name = `${LIST_NAMES[list.kind][language]} ${list.index}`;
    if (listEntry(state) !== null) return name;
    return `${name}, ${language === 'de' ? 'leer' : 'empty'}`;
  }
  return `${ITEM_NAMES[state.item][language]} ${state.settings[state.item]}`;
}

export function atr833Readout(state: unknown, language: keyof Text, on: boolean): string {
  const unit = state as Atr833State;
  const de = language === 'de';
  if (!on || !unit.on) return de ? 'Aus' : 'Off';
  const watching = de ? 'Doppelhören' : 'dual watch';
  const standby = unit.dualWatch ? watching : de ? 'Standby' : 'standby';
  return [
    `${de ? 'Aktiv' : 'Active'} ${mhz(unit.active, language)}`,
    `${standby} ${mhz(unit.standby, language)}`,
    lineThree(unit, language),
  ].join(', ');
}

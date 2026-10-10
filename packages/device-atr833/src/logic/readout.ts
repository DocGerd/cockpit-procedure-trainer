import type { Text } from '@cpt/core';
import { formatFrequency, listEntry } from './atr833';
import type { Atr833Item, Atr833State } from './atr833';

const ITEM_NAMES: Readonly<Record<Atr833Item, Text>> = {
  vol: { de: 'Lautstärke', en: 'volume' },
  sql: { de: 'Squelch', en: 'squelch' },
  vox: { de: 'VOX', en: 'VOX' },
  int: { de: 'Bordsprechanlage', en: 'intercom' },
  stl: { de: 'STL', en: 'STL' },
  str: { de: 'STR', en: 'STR' },
  ext: { de: 'Externer Eingang', en: 'external audio' },
  brt: { de: 'Helligkeit', en: 'brightness' },
};

const LIST_NAMES = {
  mem: { de: 'Speicher', en: 'memory' },
  lst: { de: 'Letzte Frequenzen', en: 'last frequencies' },
} as const;

const mhz = (khz: number, language: keyof Text): string =>
  `${formatFrequency(khz).replace('.', language === 'de' ? ',' : '.')} MHz`;

function lineThree(state: Atr833State, language: keyof Text): string {
  const de = language === 'de';
  const { list } = state;
  if (list?.kind === 'save') {
    return de ? `Speichern auf Platz ${list.index + 1}` : `save to memory ${list.index + 1}`;
  }
  if (list !== null) {
    const entry = listEntry(state);
    const name = `${LIST_NAMES[list.kind][language]} ${list.index + 1}`;
    return entry === null
      ? `${name}, ${de ? 'leer' : 'empty'}`
      : `${name}, ${mhz(entry, language)}`;
  }
  const value = state.settings[state.item];
  const off = de ? 'aus' : 'off';
  const shown = state.item === 'ext' && value === 0 ? off : String(value);
  return `${ITEM_NAMES[state.item][language]} ${shown}`;
}

export function atr833Readout(state: unknown, language: keyof Text, on: boolean): string {
  const unit = state as Atr833State;
  const de = language === 'de';
  if (!on || !unit.on) return de ? 'Aus' : 'Off';
  const watching = de ? 'Doppelhören' : 'dual watch';
  const standby = unit.dualWatch ? watching : de ? 'Standby' : 'standby';
  const parts = [
    `${de ? 'Aktiv' : 'Active'} ${mhz(unit.active, language)}`,
    `${standby} ${mhz(unit.standby, language)}`,
  ];
  if (unit.saved) parts.push(de ? 'gespeichert' : 'saved');
  parts.push(lineThree(unit, language));
  return parts.join(', ');
}

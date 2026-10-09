import type { CtslProcedures } from '../types';
import type { TrainerState } from '@cpt/core';
import { text } from '../text';

// An aircraft depends on core only, so it reads a device's state structurally.
export const field = (state: TrainerState<unknown>, install: string, name: string): unknown => {
  const device = state.devices[install]?.state;
  return typeof device === 'object' && device !== null
    ? (device as Record<string, unknown>)[name]
    : undefined;
};

const RADIO_ACTIVE_KHZ = 120000;
const VFR_CODE = '7000';

export const avionicsProcedures = {
  radioAndTransponder: {
    title: text('Funkgerät und Transponder einstellen', 'Set the radio and the transponder'),
    type: 'normal',
    startPhase: 'holding',
    items: [
      {
        type: 'action',
        control: 'com.coarse',
        position: 'up',
        text: text(
          'Bereitschaftsfrequenz um 1 MHz erhöhen',
          'Raise the standby frequency by 1 MHz',
        ),
      },
      {
        type: 'action',
        control: 'com.swap',
        position: 'pressed',
        text: text('Bereitschaftsfrequenz aktiv schalten', 'Swap the standby frequency to active'),
      },
      {
        type: 'check',
        target: { control: 'com.swap' },
        condition: (state) => field(state, 'com', 'active') === RADIO_ACTIVE_KHZ,
        text: text('Aktive Frequenz 120,000', 'Active frequency 120.000'),
      },
      {
        type: 'action',
        control: 'xpdr.mode',
        position: 'sby',
        text: text('Transponder auf Bereitschaft', 'Transponder to standby'),
      },
      {
        type: 'action',
        control: 'xpdr.vfr',
        position: 'pressed',
        text: text('Code auf 7000 setzen', 'Set the code to 7000'),
      },
      {
        type: 'check',
        target: { control: 'xpdr.vfr' },
        condition: (state) =>
          field(state, 'xpdr', 'squawk') === VFR_CODE && field(state, 'xpdr', 'mode') === 'sby',
        text: text('Code 7000, Bereitschaft', 'Code 7000, standby'),
      },
      {
        type: 'action',
        control: 'xpdr.mode',
        position: 'alt',
        text: text('Transponder auf Höhe', 'Transponder to altitude'),
      },
      {
        type: 'check',
        target: { control: 'xpdr.mode' },
        condition: (state) =>
          field(state, 'xpdr', 'mode') === 'alt' && field(state, 'xpdr', 'reporting') === true,
        text: text('Transponder meldet Höhe', 'Transponder reports altitude'),
      },
    ],
  },
} as const satisfies CtslProcedures;

import { fixtureAircraft } from '../contract/fixtures';
import type { FixtureState } from '../contract/fixtures';
import type { Aircraft, Text, TrainerState } from '../contract';
import { defineDevice } from './define-device';

export type MonitorState = { readonly page: string; readonly reading: number | null };

const text = (de: string, en: string): Text => ({ de, en });

export const engineMonitor = defineDevice({
  id: 'engineMonitor',
  manual: text('Fiktives Handbuch, Rev. 1', 'Fictional manual, rev. 1'),
  notModelled: [text('Datenaufzeichnung', 'Data logging')],
  controls: {
    page: {
      kind: 'rotary',
      positions: ['engine', 'electrical'],
      initial: 'engine',
      name: text('Seite', 'Page'),
      description: text('Wählt die Anzeigeseite.', 'Selects the display page.'),
    },
  },
  initial: { page: 'engine', reading: null } as MonitorState,
  step: (state, { controls, powered, inputs }): MonitorState => {
    const page = String(controls.page);
    const value = page === 'engine' ? inputs.rpm : inputs.volts;
    return { page, reading: powered && typeof value === 'number' ? value : null };
  },
});

export const monitorState = (state: TrainerState<unknown>): MonitorState | undefined =>
  state.devices.mon?.state as MonitorState | undefined;

const fixtureState = (state: TrainerState<unknown>) => state.systems as FixtureState;

export const fixtureDeviceAircraft = {
  ...fixtureAircraft,
  devices: {
    mon: {
      device: 'engineMonitor',
      view: 'panel',
      placement: { rect: { x: 260, y: 10, w: 80, h: 40 } },
      powered: (state: TrainerState<unknown>) => fixtureState(state).busPowered,
      inputs: {
        rpm: (state: TrainerState<unknown>) => fixtureState(state).rpm,
        volts: (state: TrainerState<unknown>) => fixtureState(state).volts,
      },
    },
  },
  procedures: {
    ...fixtureAircraft.procedures,
    monitorElectrical: {
      title: text('Monitor prüfen', 'Check the monitor'),
      type: 'normal',
      startPhase: 'runup',
      items: [
        {
          type: 'action',
          control: 'mon.page',
          position: 'electrical',
          text: text('Monitor auf Elektrik', 'Monitor to electrical'),
        },
        {
          type: 'check',
          target: { control: 'mon.page' },
          condition: (state: TrainerState<unknown>) => monitorState(state)?.page === 'electrical',
          text: text('Elektrikseite angezeigt', 'Electrical page shown'),
        },
      ],
    },
  },
} as Aircraft;

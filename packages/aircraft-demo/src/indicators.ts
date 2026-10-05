import { text } from './text';
import { lowVoltageLit, oilPressureLit } from './systems';
import type { DemoTrainerState } from './systems';

export const indicators = {
  tachometer: {
    name: text('Drehzahl', 'Tachometer'),
    select: (state: DemoTrainerState) => state.systems.rpm,
    appearance: {
      widget: 'round-gauge',
      options: {
        min: 0,
        max: 3000,
        units: 'rpm',
        ticks: [0, 500, 1000, 1500, 2000, 2500, 3000],
        arcs: [
          { from: 1000, to: 2500, colour: 'green' },
          { from: 2700, to: 3000, colour: 'red' },
        ],
      },
    },
  },
  oilPressure: {
    name: text('Öldruck', 'Oil pressure'),
    select: (state: DemoTrainerState) => state.systems.oilPsi,
    appearance: {
      widget: 'round-gauge',
      options: {
        min: 0,
        max: 100,
        units: 'psi',
        ticks: [0, 20, 40, 60, 80, 100],
        arcs: [
          { from: 0, to: 20, colour: 'red' },
          { from: 20, to: 40, colour: 'yellow' },
          { from: 40, to: 85, colour: 'green' },
          { from: 85, to: 100, colour: 'red' },
        ],
      },
    },
  },
  ammeter: {
    name: text('Amperemeter', 'Ammeter'),
    select: (state: DemoTrainerState) => state.systems.amps,
    appearance: {
      widget: 'round-gauge',
      options: {
        min: -30,
        max: 30,
        units: 'A',
        ticks: [-30, -15, 0, 15, 30],
        arcs: [
          { from: -30, to: 0, colour: 'yellow' },
          { from: 0, to: 30, colour: 'green' },
        ],
      },
    },
  },
  lowVoltageLamp: {
    name: text('SPANNUNG', 'LOW VOLT'),
    select: lowVoltageLit,
    appearance: { widget: 'annunciator', options: { lamp: 'amber' } },
  },
  oilPressureLamp: {
    name: text('ÖLDRUCK', 'OIL PRESS'),
    select: oilPressureLit,
    appearance: { widget: 'annunciator', options: { lamp: 'red' } },
  },
  hourMeter: {
    name: text('Betriebsstunden', 'Hour meter'),
    select: (state: DemoTrainerState) => state.systems.engineHours,
    appearance: { widget: 'digital-readout', options: { units: 'h', decimals: 1 } },
  },
};

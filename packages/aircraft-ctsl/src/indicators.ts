import type { IndicatorDefinition } from '@cpt/core';
import type { CtslState, CtslTrainerState } from './systems';
import { text } from './text';

export const chargeLampLit = (state: CtslTrainerState) =>
  state.systems.bus.mainPowered && !state.systems.bus.charging;

export const indicators = {
  airspeed: {
    name: text('IAS', 'IAS'),
    select: (state: CtslTrainerState) => state.systems.airspeedKmh,
    appearance: {
      widget: 'round-gauge',
      options: {
        min: 40,
        max: 300,
        units: 'km/h',
        ticks: [40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300],
        arcs: [
          { from: 72, to: 115, colour: 'white' },
          { from: 94, to: 245, colour: 'green' },
          { from: 245, to: 260, colour: 'yellow' },
          { from: 260, to: 300, colour: 'red' },
        ],
      },
    },
  },
  altimeter: {
    name: text('ALT', 'ALT'),
    select: (state: CtslTrainerState) => state.systems.altitudeFt,
    appearance: {
      widget: 'round-gauge',
      options: {
        min: 0,
        max: 5000,
        units: 'ft',
        ticks: [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000],
      },
    },
  },
  verticalSpeed: {
    name: text('VSI', 'VSI'),
    select: (state: CtslTrainerState) => state.systems.verticalSpeedMs,
    appearance: {
      widget: 'round-gauge',
      options: { min: -5, max: 5, units: 'm/s', ticks: [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5] },
    },
  },
  tachometer: {
    name: text('RPM', 'RPM'),
    select: (state: CtslTrainerState) => state.systems.rpm,
    appearance: {
      widget: 'round-gauge',
      options: {
        min: 0,
        max: 7000,
        units: 'rpm',
        ticks: [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000],
        arcs: [
          { from: 1400, to: 5500, colour: 'green' },
          { from: 5500, to: 5800, colour: 'yellow' },
          { from: 5800, to: 7000, colour: 'red' },
        ],
      },
    },
  },
  oilPressure: {
    name: text('OP', 'OP'),
    select: (state: CtslTrainerState) => state.systems.oilPressureBar,
    appearance: {
      widget: 'round-gauge',
      options: {
        min: 0,
        max: 10,
        units: 'bar',
        ticks: [0, 2, 4, 6, 8, 10],
        arcs: [
          { from: 0, to: 0.8, colour: 'red' },
          { from: 0.8, to: 2, colour: 'yellow' },
          { from: 2, to: 5, colour: 'green' },
          { from: 5, to: 10, colour: 'red' },
        ],
      },
    },
  },
  oilTemperature: {
    name: text('OT', 'OT'),
    select: (state: CtslTrainerState) => state.systems.oilTempC,
    appearance: {
      widget: 'round-gauge',
      options: {
        min: 40,
        max: 150,
        units: '°C',
        ticks: [40, 50, 70, 90, 110, 130, 150],
        arcs: [
          { from: 50, to: 90, colour: 'yellow' },
          { from: 90, to: 110, colour: 'green' },
          { from: 110, to: 130, colour: 'yellow' },
          { from: 130, to: 150, colour: 'red' },
        ],
      },
    },
  },
  cht: {
    name: text('CHT', 'CHT'),
    select: (state: CtslTrainerState) => state.systems.chtC,
    appearance: {
      widget: 'round-gauge',
      options: {
        min: 40,
        max: 150,
        units: '°C',
        ticks: [40, 50, 70, 90, 110, 120, 150],
        arcs: [
          { from: 50, to: 120, colour: 'green' },
          { from: 120, to: 150, colour: 'red' },
        ],
      },
    },
  },
  chargeLamp: {
    name: text('Ladekontrolle', 'Charge warning lamp'),
    select: chargeLampLit,
    appearance: { widget: 'annunciator', options: { lamp: 'red' } },
  },
  flapReadout: {
    name: text('Klappenstellungsanzeige', 'Flap position indicator'),
    select: (state: CtslTrainerState) => state.systems.flaps.angle,
    appearance: { widget: 'digital-readout', options: { units: '°', decimals: 0 } },
  },
  eltLamp: {
    name: text('Notsender', 'ELT lamp'),
    select: (state: CtslTrainerState) => state.systems.eltTransmitting,
    appearance: { widget: 'annunciator', options: { lamp: 'red' } },
  },
} as const satisfies Record<string, IndicatorDefinition<CtslState>>;

export type IndicatorId = keyof typeof indicators;

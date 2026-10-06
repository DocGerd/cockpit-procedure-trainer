import type { IndicatorDefinition } from '@cpt/core';
import { gaugeArtwork } from './artwork';
import type { CtslState, CtslTrainerState } from './systems';
import { text } from './text';

export const chargeLampLit = (state: CtslTrainerState) =>
  state.systems.bus.mainPowered && !state.systems.bus.charging;

export const indicators = {
  compass: {
    name: text('Magnetkompass', 'Magnetic compass'),
    select: (state: CtslTrainerState) => state.systems.headingDeg,
    appearance: gaugeArtwork.compass,
  },
  airspeed: {
    name: text('Fahrtmesser', 'Airspeed indicator'),
    select: (state: CtslTrainerState) => state.systems.airspeedKmh,
    appearance: gaugeArtwork.airspeed,
  },
  altimeter: {
    name: text('Höhenmesser', 'Altimeter'),
    select: (state: CtslTrainerState) => state.systems.altitudeFt,
    appearance: gaugeArtwork.altimeter,
  },
  verticalSpeed: {
    name: text('Variometer', 'Vertical speed indicator'),
    select: (state: CtslTrainerState) => state.systems.verticalSpeedMs,
    appearance: gaugeArtwork.verticalSpeed,
  },
  tachometer: {
    name: text('Drehzahlmesser', 'Tachometer'),
    select: (state: CtslTrainerState) => state.systems.rpm,
    appearance: gaugeArtwork.tachometer,
  },
  oilPressure: {
    name: text('Öldruck', 'Oil pressure'),
    select: (state: CtslTrainerState) => state.systems.oilPressureBar,
    appearance: gaugeArtwork.oilPressure,
  },
  oilTemperature: {
    name: text('Öltemperatur', 'Oil temperature'),
    select: (state: CtslTrainerState) => state.systems.oilTempC,
    appearance: gaugeArtwork.oilTemperature,
  },
  cht: {
    name: text('Zylinderkopftemperatur', 'Cylinder head temperature'),
    select: (state: CtslTrainerState) => state.systems.chtC,
    appearance: gaugeArtwork.cht,
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

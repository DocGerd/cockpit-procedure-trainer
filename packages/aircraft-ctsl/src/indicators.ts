import type { IndicatorDefinition } from '@cpt/core';
import { gaugeArtwork, lampArtwork } from './artwork';
import { FT_PER_MIN_PER_MS } from './systems';
import type { CtslState, CtslTrainerState } from './systems';
import { text } from './text';

export const chargeLampLit = (state: CtslTrainerState) =>
  state.systems.bus.mainPowered && !state.systems.bus.charging;

const flapCircuitPowered = (state: CtslTrainerState) =>
  state.systems.bus.mainPowered && state.controls['flapBreaker'] === 'in';

export const indicators = {
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
    select: (state: CtslTrainerState) => state.systems.verticalSpeedMs * FT_PER_MIN_PER_MS,
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
  voltmeter: {
    name: text('Voltmeter', 'Voltmeter'),
    select: (state: CtslTrainerState) => state.systems.bus.volts,
    appearance: gaugeArtwork.voltmeter,
  },
  chargeLamp: {
    name: text('Generatorlampe', 'Generator warning lamp'),
    select: chargeLampLit,
    appearance: lampArtwork.charge,
  },
  flapReadout: {
    name: text('Klappenstellungsanzeige', 'Flap position indicator'),
    select: (state: CtslTrainerState) =>
      flapCircuitPowered(state) ? state.systems.flaps.angle : '',
    blink: (state: CtslTrainerState) => flapCircuitPowered(state) && state.systems.flaps.moving,
    appearance: { widget: 'digital-readout', options: { units: '°', decimals: 0 } },
  },
  eltLamp: {
    name: text('Notsender', 'ELT lamp'),
    select: (state: CtslTrainerState) => state.systems.eltTransmitting,
    appearance: { widget: 'annunciator', options: { lamp: 'red' } },
  },
} as const satisfies Record<string, IndicatorDefinition<CtslState>>;

export type IndicatorId = keyof typeof indicators;

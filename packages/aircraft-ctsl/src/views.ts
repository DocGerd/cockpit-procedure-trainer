import type { ControlId, Placement, ViewDefinition } from '@cpt/core';
import { images } from './assets';
import type { controls } from './controls';
import type { IndicatorId } from './indicators';
import { text } from './text';

type CtslView = ViewDefinition<ControlId<typeof controls>, IndicatorId>;

const at = (x: number, y: number, w: number, h: number, ...printed: string[]): Placement => ({
  rect: { x, y, w, h },
  ...(printed.length > 0 ? { printed } : {}),
});

export const deviceSlots = {
  com: at(190, 360, 520, 150),
  xpdr: at(190, 520, 520, 150),
  gps: at(1168, 40, 400, 300),
} as const satisfies Record<string, Placement>;

export const views = {
  panel: {
    name: text('Instrumententafel', 'Panel'),
    image: images.panel,
    size: { width: 1900, height: 700 },
    controls: {
      comBreaker: at(1606, 70, 84, 130),
      xpdrBreaker: at(1606, 220, 84, 130),
      positionBreaker: at(1694, 220, 84, 130),
      intercomBreaker: at(1782, 220, 84, 130),
      gpsBreaker: at(1606, 370, 84, 130),
      strobeBreaker: at(1694, 370, 84, 130),
      landingBreaker: at(1782, 370, 84, 130),
      outletBreaker: at(1606, 520, 84, 130),
    },
    indicators: {
      compass: at(856, 30, 290, 290),
      airspeed: at(160, 90, 220, 220),
      verticalSpeed: at(395, 32, 160, 160),
      chargeLamp: at(570, 32, 110, 70),
      altimeter: at(575, 115, 220, 220),
      tachometer: at(872, 360, 220, 220),
      oilPressure: at(1102, 390, 160, 160),
      oilTemperature: at(1267, 390, 160, 160),
      cht: at(1432, 390, 160, 160),
    },
  },
  centre: {
    name: text('Mittelfeld', 'Centre field'),
    image: images.centre,
    size: { width: 1200, height: 900 },
    controls: {
      avionicsMaster: at(40, 30, 200, 200),
      beacon: at(260, 30, 150, 200),
      positionLights: at(420, 30, 150, 200),
      intercom: at(580, 30, 150, 200),
      cockpitLight: at(740, 30, 150, 200),
      landingLight: at(900, 30, 150, 200),
      elt: at(60, 380, 150, 160, 'ELT'),
      flapBreaker: at(690, 380, 110, 150),
      fuelValve: at(30, 570, 180, 300),
      ignition: at(210, 610, 260, 260, 'IGNITION'),
      flapSelector: at(520, 570, 290, 290),
      battery: at(860, 640, 140, 220, 'BAT'),
      generator: at(1020, 640, 140, 220, 'GEN'),
    },
    indicators: {
      eltLamp: at(220, 400, 110, 70),
      flapReadout: at(420, 400, 240, 110),
    },
  },
  console: {
    name: text('Mittelkonsole', 'Centre console'),
    image: images.console,
    size: { width: 1200, height: 720 },
    controls: {
      brake: at(40, 30, 140, 380),
      throttle: at(200, 30, 150, 380),
      choke: at(360, 30, 140, 380),
      parkingBrakeValve: at(530, 60, 180, 180),
      carbHeat: at(530, 280, 150, 300),
      trim: at(360, 430, 170, 270),
      rescueHandle: at(844, 140, 300, 400),
    },
  },
} as const satisfies Record<string, CtslView>;

export type ViewId = keyof typeof views;

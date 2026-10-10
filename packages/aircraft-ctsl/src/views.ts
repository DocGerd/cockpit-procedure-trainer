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
      comBreaker: at(1606, 116, 84, 130),
      xpdrBreaker: at(1606, 250, 84, 130),
      positionBreaker: at(1694, 250, 84, 130),
      intercomBreaker: at(1782, 250, 84, 130),
      gpsBreaker: at(1606, 384, 84, 130),
      strobeBreaker: at(1694, 384, 84, 130),
      landingBreaker: at(1782, 384, 84, 130),
      outletBreaker: at(1606, 518, 84, 130),
    },
    indicators: {
      compass: at(878, 40, 150, 150),
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
      avionicsMaster: at(30, 20, 220, 245),
      beacon: at(260, 16, 150, 219),
      positionLights: at(420, 16, 150, 219),
      intercom: at(580, 16, 150, 219),
      cockpitLight: at(740, 16, 150, 219),
      landingLight: at(900, 16, 150, 219),
      elt: at(292, 386, 160, 160),
      flapBreaker: at(850, 372, 124, 169),
      ignition: at(93, 610, 260, 260, 'IGNITION'),
      // After the ignition, so the closed valve's handle lies over the key slot.
      fuelValve: at(161, 392, 124, 382, 'FUEL', 'VALVE', 'OPEN', 'CLOSED'),
      flapSelector: at(555, 590, 290, 290),
      battery: at(860, 640, 140, 220, 'BAT'),
      generator: at(1020, 640, 140, 220, 'GEN'),
    },
    indicators: {
      eltLamp: at(458, 431, 100, 64),
      flapReadout: at(580, 400, 240, 110, 'FLAPS'),
    },
  },
  console: {
    name: text('Mittelkonsole', 'Centre console'),
    image: images.console,
    size: { width: 1200, height: 807 },
    controls: {
      trim: at(20, 8, 210, 292),
      choke: at(242, 8, 180, 292),
      throttle: at(434, 8, 200, 292),
      brake: at(646, 8, 180, 292),
      parkingBrakeValve: at(646, 302, 180, 180),
      carbHeat: at(940, 16, 150, 300),
      rescueHandle: at(372, 494, 216, 290),
    },
  },
} as const satisfies Record<string, CtslView>;

export type ViewId = keyof typeof views;

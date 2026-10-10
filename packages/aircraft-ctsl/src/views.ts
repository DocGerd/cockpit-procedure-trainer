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
  com: at(487, 495, 556.4, 160.5),
  xpdr: at(1051.4, 495, 556.4, 160.5),
  gps: at(835.5, 132, 428, 321),
} as const satisfies Record<string, Placement>;

export const views = {
  panel: {
    name: text('Instrumententafel', 'Panel'),
    image: images.panel,
    size: { width: 2372, height: 700 },
    controls: {
      comBreaker: at(1650, 372, 100, 96),
      xpdrBreaker: at(1850, 372, 100, 96),
      landingBreaker: at(1650, 468, 100, 96),
      strobeBreaker: at(1950, 468, 100, 96),
      positionBreaker: at(2050, 468, 100, 96),
      intercomBreaker: at(2150, 468, 100, 96),
      gpsBreaker: at(2250, 468, 100, 96),
      outletBreaker: at(1650, 564, 100, 96),
    },
    indicators: {
      airspeed: at(22, 126, 220, 220),
      altimeter: at(248, 138, 196, 196),
      verticalSpeed: at(248, 372, 196, 196),
      tachometer: at(1654, 40, 210, 210),
      cht: at(1878, 40, 150, 150),
      voltmeter: at(2034, 40, 150, 150),
      oilTemperature: at(1878, 196, 150, 150),
      oilPressure: at(2034, 196, 150, 150),
      chargeLamp: at(2196, 36, 150, 90),
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
      fuelValve: at(161, 392, 124, 382, 'Open', 'Fuel', 'Valve', 'Closed'),
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
      parkingBrakeValve: at(930, 332, 180, 180),
      carbHeat: at(940, 16, 150, 300),
      rescueHandle: at(492, 494, 216, 290),
    },
  },
} as const satisfies Record<string, CtslView>;

export type ViewId = keyof typeof views;

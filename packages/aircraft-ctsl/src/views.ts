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

// D-MPGO's arrangement and relative sizes (intake §3.9.3): the FLARM display top left beside the
// checklist card, the GPS dominating mid-field, centred over the COM and transponder pair. Each
// slot keeps its mirror's aspect; the dock holds the full-size unit.
export const deviceSlots = {
  flarm: at(962, 45, 120, 60),
  gps: at(1027, 225, 347, 217),
  com: at(1033, 521, 139, 139),
  xpdr: at(1222, 521, 139, 139),
} as const satisfies Record<string, Placement>;

export const views = {
  panel: {
    name: text('Instrumententafel', 'Panel'),
    image: images.panel,
    size: { width: 2372, height: 700 },
    // D-MPGO's breaker grid at the touch-target pitch at the floor, wider and taller than on
    // the aircraft (intake §3.9.4).
    controls: {
      comBreaker: at(1541, 434, 98, 94),
      xpdrBreaker: at(1737, 434, 98, 94),
      landingBreaker: at(1541, 528, 98, 94),
      strobeBreaker: at(1835, 528, 98, 94),
      positionBreaker: at(1933, 528, 98, 94),
      intercomBreaker: at(2031, 528, 98, 94),
      gpsBreaker: at(2129, 528, 98, 94),
      outletBreaker: at(1639, 590, 98, 94),
      // The knob on its lug at the altimeter's lower left (intake §3.10.2), with its tap area
      // grown around it to the touch target at the floor, clear of the airspeed indicator and VSI.
      altimeterSetting: at(591, 340, 100, 100),
    },
    indicators: {
      airspeed: at(366, 196, 193, 193),
      altimeter: at(615, 198, 193, 193),
      verticalSpeed: at(647, 442, 137, 137),
      tachometer: at(1589, 81, 139, 139),
      cht: at(1613, 248, 77, 77),
      voltmeter: at(1715, 248, 77, 77),
      oilTemperature: at(1613, 351, 77, 77),
      oilPressure: at(1715, 351, 77, 77),
      chargeLamp: at(1749, 62, 150, 90),
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
      ignition: at(93, 610, 260, 260, 'Ignition'),
      // After the ignition, so the closed valve's handle lies over the key slot.
      fuelValve: at(161, 392, 124, 382, 'Open', 'Fuel', 'Valve', 'Closed'),
      flapSelector: at(555, 590, 290, 290),
      battery: at(860, 640, 140, 220, 'BAT'),
      generator: at(1020, 640, 140, 220, 'GEN'),
    },
    indicators: {
      eltLamp: at(458, 431, 100, 64),
      flapReadout: at(580, 400, 240, 110, 'Flaps'),
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
      parkingBrakeValve: at(1016, 332, 180, 180),
      carbHeat: at(940, 16, 150, 300),
      rescueHandle: at(492, 494, 216, 290),
    },
  },
} as const satisfies Record<string, CtslView>;

export type ViewId = keyof typeof views;

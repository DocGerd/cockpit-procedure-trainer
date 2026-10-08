import type { ControlId, Environment, PhaseDefinition, PhaseId, PositionOf } from '@cpt/core';
import { phaseHeadings } from './airfield';
import { images } from './assets';
import type { controls } from './controls';
import { initial, runningFrom } from './systems';
import type { CtslState } from './systems';

type Controls = typeof controls;
type EntryControls = { readonly [K in ControlId<Controls>]: PositionOf<Controls[K]> };

const parked = {
  comBreaker: 'in',
  xpdrBreaker: 'in',
  gpsBreaker: 'in',
  positionBreaker: 'in',
  strobeBreaker: 'in',
  landingBreaker: 'in',
  intercomBreaker: 'in',
  outletBreaker: 'in',
  avionicsMaster: 'off',
  beacon: 'off',
  positionLights: 'off',
  intercom: 'off',
  cockpitLight: 'off',
  landingLight: 'off',
  elt: 'armed',
  flapBreaker: 'in',
  fuelValve: 'closed',
  flapSelector: '0',
  ignition: 'out',
  battery: 'pulled',
  generator: 'pulled',
  brake: 'off',
  throttle: 'idle',
  choke: 'off',
  carbHeat: 'off',
  trim: 'neutral',
  parkingBrakeValve: 'closed',
  rescueHandle: 'stowed',
} as const satisfies EntryControls;

const holdingShort = {
  ...parked,
  avionicsMaster: 'on',
  beacon: 'on',
  intercom: 'on',
  fuelValve: 'open',
  ignition: 'both',
  battery: 'in',
  generator: 'in',
} as const satisfies EntryControls;

const rolling = { ...holdingShort, parkingBrakeValve: 'open' } as const;

// Trainer estimate: taxiing on low power, warm as at the holding point (intake §5).
const taxiingOut = { ...rolling, throttle: 'low' } as const;

// Intake §6 N6 ends at the holding point with flaps 15° and the brake released.
const linedUpOnRunway = { ...rolling, flapSelector: '15' } as const;
const departing = { ...rolling, throttle: 'full', flapSelector: '0' } as const;
const cruising = { ...rolling, throttle: 'cruise', flapSelector: '-12' } as const;
const approaching = {
  ...rolling,
  throttle: 'low',
  flapSelector: '15',
  landingLight: 'on',
} as const;
const flaring = { ...rolling, flapSelector: '30', landingLight: 'on' } as const;
const taxiingIn = { ...rolling, throttle: 'low', flapSelector: '30', landingLight: 'on' } as const;
const securing = { ...rolling } as const;

// Intake §4.5: the pin is removed before take-off and back in at shutdown.
const pinOut = { rescueHandle: 'open' } as const;

// Assumed (unverified): ALT from line-up until after landing, standby once taxied in.
const transponder = (mode: 'alt' | 'sby') => ({ xpdr: { mode } });

// Assumed (unverified): the German VFR code squawked from line-up, the GPS on with its map page
// and a position fix.
const squawking = { xpdr: { squawk: '7000' } };
const navigating = { ...squawking, gps: { on: true, page: 'map', fix: true } };

// Assumed (unverified): a typical climb and approach descent of a light aircraft.
const CLIMB_MS = 3;
const APPROACH_DESCENT_MS = -2;

const ground = (): Environment => ({ airspeedKt: 0, altitudeFt: 0, onGround: true });
const departureEnvironment: Environment = { airspeedKt: 57, altitudeFt: 200, onGround: false };
const cruiseEnvironment: Environment = { airspeedKt: 108, altitudeFt: 2500, onGround: false };
const approachEnvironment: Environment = { airspeedKt: 59, altitudeFt: 500, onGround: false };
const landingEnvironment: Environment = { airspeedKt: 54, altitudeFt: 3, onGround: false };

const facing = (phase: PhaseId, state: CtslState): CtslState => ({
  ...state,
  headingDeg: phaseHeadings[phase],
});

export const phases = {
  parking: {
    image: images.parking,
    imageRunning: images.parkingRunning,
    environment: ground(),
    entry: { controls: parked, state: facing('parking', initial) },
  },
  taxiOut: {
    image: images.taxiOut,
    imageRunning: images.taxiOutRunning,
    environment: ground(),
    entry: { controls: taxiingOut, state: facing('taxiOut', runningFrom(taxiingOut)) },
  },
  holding: {
    image: images.holding,
    imageRunning: images.holdingRunning,
    environment: ground(),
    entry: { controls: holdingShort, state: facing('holding', runningFrom(holdingShort)) },
  },
  linedUp: {
    image: images.linedUp,
    imageRunning: images.linedUpRunning,
    environment: ground(),
    entry: {
      controls: linedUpOnRunway,
      state: facing('linedUp', runningFrom(linedUpOnRunway)),
      guards: pinOut,
      devices: transponder('alt'),
      deviceStates: navigating,
    },
  },
  departure: {
    image: images.departure,
    imageRunning: images.departureRunning,
    environment: departureEnvironment,
    entry: {
      controls: departing,
      state: {
        ...facing('departure', runningFrom(departing, departureEnvironment)),
        verticalSpeedMs: CLIMB_MS,
      },
      guards: pinOut,
      devices: transponder('alt'),
      deviceStates: navigating,
    },
  },
  cruise: {
    image: images.cruise,
    imageRunning: images.cruiseRunning,
    environment: cruiseEnvironment,
    entry: {
      controls: cruising,
      state: facing('cruise', runningFrom(cruising, cruiseEnvironment)),
      guards: pinOut,
      devices: transponder('alt'),
      deviceStates: navigating,
    },
  },
  approach: {
    image: images.approach,
    imageRunning: images.approachRunning,
    environment: approachEnvironment,
    entry: {
      controls: approaching,
      state: {
        ...facing('approach', runningFrom(approaching, approachEnvironment)),
        verticalSpeedMs: APPROACH_DESCENT_MS,
      },
      guards: pinOut,
      devices: transponder('alt'),
      deviceStates: navigating,
    },
  },
  landing: {
    image: images.landing,
    imageRunning: images.landingRunning,
    environment: landingEnvironment,
    entry: {
      controls: flaring,
      state: facing('landing', runningFrom(flaring, landingEnvironment)),
      guards: pinOut,
      devices: transponder('alt'),
      deviceStates: navigating,
    },
  },
  taxiIn: {
    image: images.taxiIn,
    imageRunning: images.taxiInRunning,
    environment: ground(),
    entry: {
      controls: taxiingIn,
      state: facing('taxiIn', runningFrom(taxiingIn)),
      guards: pinOut,
      devices: transponder('alt'),
      deviceStates: navigating,
    },
  },
  parkingSecuring: {
    image: images.parkingSecuring,
    imageRunning: images.parkingSecuringRunning,
    environment: ground(),
    entry: {
      controls: securing,
      state: facing('parkingSecuring', runningFrom(securing)),
      guards: pinOut,
      devices: transponder('sby'),
      deviceStates: squawking,
    },
  },
} as const satisfies Record<PhaseId, PhaseDefinition<CtslState, Controls>>;

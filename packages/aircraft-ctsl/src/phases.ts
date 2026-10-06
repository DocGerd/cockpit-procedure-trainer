import type { ControlId, Environment, PhaseDefinition, PositionOf } from '@cpt/core';
import { images } from './assets';
import type { controls } from './controls';
import { initial, runningFrom } from './systems';
import type { CtslState } from './systems';
import { text } from './text';

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
  ignition: 'off',
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
  fuelValve: 'open',
  ignition: 'both',
  battery: 'in',
  generator: 'in',
} as const satisfies EntryControls;

const rolling = { ...holdingShort, parkingBrakeValve: 'open' } as const;

const departing = { ...rolling, throttle: 'full', flapSelector: '0' } as const;
const cruising = { ...rolling, throttle: 'cruise', flapSelector: '-12' } as const;
const approaching = { ...rolling, throttle: 'low', flapSelector: '15' } as const;
const flaring = { ...rolling, flapSelector: '30' } as const;
const taxiingIn = { ...rolling, throttle: 'low', flapSelector: '30' } as const;
const securing = { ...rolling } as const;

// Intake §4.5: the pin is removed before take-off and back in at shutdown.
const pinOut = { rescueHandle: 'open' } as const;

const ground = (): Environment => ({ airspeedKt: 0, altitudeFt: 0, onGround: true });
const departureEnvironment: Environment = { airspeedKt: 57, altitudeFt: 200, onGround: false };
const cruiseEnvironment: Environment = { airspeedKt: 108, altitudeFt: 2500, onGround: false };
const approachEnvironment: Environment = { airspeedKt: 59, altitudeFt: 500, onGround: false };
const landingEnvironment: Environment = { airspeedKt: 54, altitudeFt: 3, onGround: false };

export const phases = {
  parking: {
    name: text('Parkposition', 'Parking'),
    image: images.parking,
    environment: ground(),
    entry: { controls: parked, state: initial },
  },
  holding: {
    name: text('Rollhalt', 'Holding point'),
    image: images.holding,
    environment: ground(),
    entry: { controls: holdingShort, state: runningFrom(holdingShort) },
  },
  linedUp: {
    name: text('Auf der Piste ausgerichtet', 'Lined up on the runway'),
    image: images.linedUp,
    environment: ground(),
    entry: { controls: holdingShort, state: runningFrom(holdingShort) },
  },
  departure: {
    name: text('Abflug', 'Departure'),
    image: images.departure,
    environment: departureEnvironment,
    entry: {
      controls: departing,
      state: runningFrom(departing, departureEnvironment),
      guards: pinOut,
    },
  },
  cruise: {
    name: text('Reiseflug', 'Cruise'),
    image: images.cruise,
    environment: cruiseEnvironment,
    entry: { controls: cruising, state: runningFrom(cruising, cruiseEnvironment), guards: pinOut },
  },
  approach: {
    name: text('Anflug', 'Approach'),
    image: images.approach,
    environment: approachEnvironment,
    entry: {
      controls: approaching,
      state: runningFrom(approaching, approachEnvironment),
      guards: pinOut,
    },
  },
  landing: {
    name: text('Landung', 'Landing'),
    image: images.landing,
    environment: landingEnvironment,
    entry: { controls: flaring, state: runningFrom(flaring, landingEnvironment), guards: pinOut },
  },
  taxiIn: {
    name: text('Rollen zum Vorfeld', 'Taxi in'),
    image: images.taxiIn,
    environment: ground(),
    entry: { controls: taxiingIn, state: runningFrom(taxiingIn), guards: pinOut },
  },
  parkingSecuring: {
    name: text('Parken und Sichern', 'Parking and securing'),
    image: images.parkingSecuring,
    environment: ground(),
    entry: { controls: securing, state: runningFrom(securing), guards: pinOut },
  },
} as const satisfies Record<string, PhaseDefinition<CtslState, Controls>>;

export type PhaseId = keyof typeof phases;

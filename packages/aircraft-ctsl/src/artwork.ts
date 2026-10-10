import type { ArtworkAppearance, JsonObject, Point } from '@cpt/core';

export const images = {
  gaugeAirspeed: new URL('./assets/artwork/gauge-airspeed.svg', import.meta.url).href,
  gaugeAltimeter: new URL('./assets/artwork/gauge-altimeter.svg', import.meta.url).href,
  gaugeVsi: new URL('./assets/artwork/gauge-vsi.svg', import.meta.url).href,
  gaugeTachometer: new URL('./assets/artwork/gauge-tachometer.svg', import.meta.url).href,
  gaugeOilPressure: new URL('./assets/artwork/gauge-oil-pressure.svg', import.meta.url).href,
  gaugeOilTemperature: new URL('./assets/artwork/gauge-oil-temperature.svg', import.meta.url).href,
  gaugeCht: new URL('./assets/artwork/gauge-cht.svg', import.meta.url).href,
  needle: new URL('./assets/artwork/needle.svg', import.meta.url).href,
  glassGauge: new URL('./assets/artwork/glass-gauge.svg', import.meta.url).href,
  glassCompass: new URL('./assets/artwork/glass-compass.svg', import.meta.url).href,
  compassFace: new URL('./assets/artwork/compass-face.svg', import.meta.url).href,
  compassCard: new URL('./assets/artwork/compass-card.svg', import.meta.url).href,
  lampChargeFace: new URL('./assets/artwork/lamp-charge-face.svg', import.meta.url).href,
  lampChargeOff: new URL('./assets/artwork/lamp-charge-off.svg', import.meta.url).href,
  lampChargeOn: new URL('./assets/artwork/lamp-charge-on.svg', import.meta.url).href,
  rockerBeacon: new URL('./assets/artwork/rocker-beacon.svg', import.meta.url).href,
  rockerPosition: new URL('./assets/artwork/rocker-position.svg', import.meta.url).href,
  rockerIntercom: new URL('./assets/artwork/rocker-intercom.svg', import.meta.url).href,
  rockerCockpit: new URL('./assets/artwork/rocker-cockpit.svg', import.meta.url).href,
  rockerLanding: new URL('./assets/artwork/rocker-landing.svg', import.meta.url).href,
  rockerAvionics: new URL('./assets/artwork/rocker-avionics.svg', import.meta.url).href,
  rockerOn: new URL('./assets/artwork/rocker-on.svg', import.meta.url).href,
  rockerOff: new URL('./assets/artwork/rocker-off.svg', import.meta.url).href,
  rockerMasterOn: new URL('./assets/artwork/rocker-master-on.svg', import.meta.url).href,
  rockerMasterOff: new URL('./assets/artwork/rocker-master-off.svg', import.meta.url).href,
  breakerCom: new URL('./assets/artwork/breaker-com.svg', import.meta.url).href,
  breakerXpdr: new URL('./assets/artwork/breaker-xpdr.svg', import.meta.url).href,
  breakerPosition: new URL('./assets/artwork/breaker-position.svg', import.meta.url).href,
  breakerIntercom: new URL('./assets/artwork/breaker-intercom.svg', import.meta.url).href,
  breakerGps: new URL('./assets/artwork/breaker-gps.svg', import.meta.url).href,
  breakerStrobe: new URL('./assets/artwork/breaker-strobe.svg', import.meta.url).href,
  breakerLanding: new URL('./assets/artwork/breaker-landing.svg', import.meta.url).href,
  breakerOutlet: new URL('./assets/artwork/breaker-outlet.svg', import.meta.url).href,
  breakerFlap: new URL('./assets/artwork/breaker-flap.svg', import.meta.url).href,
  breakerIn: new URL('./assets/artwork/breaker-in.svg', import.meta.url).href,
  breakerPulled: new URL('./assets/artwork/breaker-pulled.svg', import.meta.url).href,
  breakerFlapIn: new URL('./assets/artwork/breaker-flap-in.svg', import.meta.url).href,
  breakerFlapPulled: new URL('./assets/artwork/breaker-flap-pulled.svg', import.meta.url).href,
  pushpullFace: new URL('./assets/artwork/pushpull-face.svg', import.meta.url).href,
  pushpullIn: new URL('./assets/artwork/pushpull-in.svg', import.meta.url).href,
  pushpullPulled: new URL('./assets/artwork/pushpull-pulled.svg', import.meta.url).href,
  fuelValveFace: new URL('./assets/artwork/fuel-valve-face.svg', import.meta.url).href,
  fuelValveOpen: new URL('./assets/artwork/fuel-valve-open.svg', import.meta.url).href,
  fuelValveClosed: new URL('./assets/artwork/fuel-valve-closed.svg', import.meta.url).href,
  eltFace: new URL('./assets/artwork/elt-face.svg', import.meta.url).href,
  eltOn: new URL('./assets/artwork/elt-on.svg', import.meta.url).href,
  eltArmed: new URL('./assets/artwork/elt-armed.svg', import.meta.url).href,
  valveFace: new URL('./assets/artwork/valve-face.svg', import.meta.url).href,
  valveOpen: new URL('./assets/artwork/valve-open.svg', import.meta.url).href,
  valveClosed: new URL('./assets/artwork/valve-closed.svg', import.meta.url).href,
  leverBrakeFace: new URL('./assets/artwork/lever-brake-face.svg', import.meta.url).href,
  leverChokeFace: new URL('./assets/artwork/lever-choke-face.svg', import.meta.url).href,
  leverThrottleFace: new URL('./assets/artwork/lever-throttle-face.svg', import.meta.url).href,
  handleBrake: new URL('./assets/artwork/handle-brake.svg', import.meta.url).href,
  handleThrottle: new URL('./assets/artwork/handle-throttle.svg', import.meta.url).href,
  leverCarbFace: new URL('./assets/artwork/lever-carb-face.svg', import.meta.url).href,
  handleCarb: new URL('./assets/artwork/handle-carb.svg', import.meta.url).href,
  trimWheelFace: new URL('./assets/artwork/trim-wheel-face.svg', import.meta.url).href,
  trimPointer: new URL('./assets/artwork/trim-pointer.svg', import.meta.url).href,
  flapSelectorFace: new URL('./assets/artwork/flap-selector-face.svg', import.meta.url).href,
  flapKnob0: new URL('./assets/artwork/flap-knob-0.svg', import.meta.url).href,
  flapKnob1: new URL('./assets/artwork/flap-knob-1.svg', import.meta.url).href,
  flapKnob2: new URL('./assets/artwork/flap-knob-2.svg', import.meta.url).href,
  flapKnob3: new URL('./assets/artwork/flap-knob-3.svg', import.meta.url).href,
  flapKnob4: new URL('./assets/artwork/flap-knob-4.svg', import.meta.url).href,
  flapKnob5: new URL('./assets/artwork/flap-knob-5.svg', import.meta.url).href,
  flapKnob6: new URL('./assets/artwork/flap-knob-6.svg', import.meta.url).href,
  ignitionFace: new URL('./assets/artwork/ignition-face.svg', import.meta.url).href,
  ignitionKeyOut: new URL('./assets/artwork/ignition-key-out.svg', import.meta.url).href,
  ignitionKeyOff: new URL('./assets/artwork/ignition-key-off.svg', import.meta.url).href,
  ignitionKeyL: new URL('./assets/artwork/ignition-key-l.svg', import.meta.url).href,
  ignitionKeyR: new URL('./assets/artwork/ignition-key-r.svg', import.meta.url).href,
  ignitionKeyBoth: new URL('./assets/artwork/ignition-key-both.svg', import.meta.url).href,
  ignitionKeyStart: new URL('./assets/artwork/ignition-key-start.svg', import.meta.url).href,
  rescueFace: new URL('./assets/artwork/rescue-face.svg', import.meta.url).href,
  rescueStowed: new URL('./assets/artwork/rescue-stowed.svg', import.meta.url).href,
  rescueStowedOpen: new URL('./assets/artwork/rescue-stowed-open.svg', import.meta.url).href,
  rescuePulled: new URL('./assets/artwork/rescue-pulled.svg', import.meta.url).href,
} as const;

const needle = (
  face: string,
  valueRange: { min: number; max: number },
  options: JsonObject,
  angleRange = { min: -135, max: 135 },
): ArtworkAppearance => ({
  options: { ...valueRange, needleShadow: true, ...options },
  artwork: {
    face,
    moving: {
      type: 'needle',
      image: images.needle,
      pivot: { x: 100, y: 100 },
      angleRange,
      valueRange,
    },
    glass: images.glassGauge,
  },
});

const positions = (face: string, moving: Record<string, string>): ArtworkAppearance => ({
  artwork: { face, moving: { type: 'positions', images: moving } },
});

const travel = (face: string, image: string, path: readonly Point[]): ArtworkAppearance => ({
  artwork: { face, moving: { type: 'travel', image, path } },
});

// A panel compass: the card is printed reversed and turns clockwise, so the numbers in the window
// increase to the left and the card slides right as the heading increases. The glass is the opaque
// housing, open only at the window over the top of the card.
const compassCard: ArtworkAppearance = {
  options: { min: 0, max: 360, units: '°', decimals: 0 },
  artwork: {
    face: images.compassFace,
    moving: {
      type: 'needle',
      image: images.compassCard,
      pivot: { x: 100, y: 100 },
      angleRange: { min: 0, max: 360 },
      valueRange: { min: 0, max: 360 },
    },
    glass: images.glassCompass,
  },
};

export const lampArtwork = {
  charge: {
    options: { lamp: 'red' },
    artwork: {
      face: images.lampChargeFace,
      moving: {
        type: 'positions',
        images: { false: images.lampChargeOff, true: images.lampChargeOn },
      },
      lettering: ['CHARGE'],
    },
  },
} as const satisfies Record<string, ArtworkAppearance>;

export const gaugeArtwork = {
  compass: compassCard,
  airspeed: needle(
    images.gaugeAirspeed,
    { min: 40, max: 300 },
    {
      units: 'km/h',
      decimals: 0,
      ticks: [40, 80, 120, 160, 200, 240, 280],
      arcs: [
        { from: 72, to: 115, colour: 'white' },
        { from: 94, to: 245, colour: 'green' },
        { from: 245, to: 260, colour: 'yellow' },
        { from: 260, to: 300, colour: 'red' },
      ],
    },
  ),
  altimeter: needle(
    images.gaugeAltimeter,
    { min: 0, max: 5000 },
    { units: 'ft', decimals: 0, ticks: [0, 1000, 2000, 3000, 4000, 5000] },
  ),
  verticalSpeed: needle(
    images.gaugeVsi,
    { min: -5, max: 5 },
    { units: 'm/s', decimals: 1, ticks: [-5, -3, -1, 0, 1, 3, 5] },
    { min: -225, max: 45 },
  ),
  tachometer: needle(
    images.gaugeTachometer,
    { min: 0, max: 7000 },
    {
      units: 'rpm',
      decimals: 0,
      ticks: [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000],
      arcs: [
        { from: 1400, to: 5500, colour: 'green' },
        { from: 5500, to: 5800, colour: 'yellow' },
        { from: 5800, to: 7000, colour: 'red' },
      ],
    },
  ),
  oilPressure: needle(
    images.gaugeOilPressure,
    { min: 0, max: 10 },
    {
      units: 'bar',
      decimals: 1,
      ticks: [0, 2, 4, 6, 8, 10],
      arcs: [
        { from: 0, to: 0.8, colour: 'red' },
        { from: 0.8, to: 2, colour: 'yellow' },
        { from: 2, to: 5, colour: 'green' },
        { from: 5, to: 10, colour: 'red' },
      ],
    },
  ),
  oilTemperature: needle(
    images.gaugeOilTemperature,
    { min: 40, max: 150 },
    {
      units: '°C',
      decimals: 0,
      ticks: [40, 50, 70, 90, 110, 130, 150],
      arcs: [
        { from: 50, to: 90, colour: 'yellow' },
        { from: 90, to: 110, colour: 'green' },
        { from: 110, to: 130, colour: 'yellow' },
        { from: 130, to: 150, colour: 'red' },
      ],
    },
  ),
  cht: needle(
    images.gaugeCht,
    { min: 40, max: 150 },
    {
      units: '°C',
      decimals: 0,
      ticks: [40, 50, 70, 90, 110, 120, 150],
      arcs: [
        { from: 50, to: 120, colour: 'green' },
        { from: 120, to: 150, colour: 'red' },
      ],
    },
  ),
} as const;

const lettered = (appearance: ArtworkAppearance, ...lettering: string[]): ArtworkAppearance => ({
  ...appearance,
  artwork: { ...appearance.artwork, lettering },
});

const breaker = (face: string, lettering: string) =>
  lettered(positions(face, { in: images.breakerIn, pulled: images.breakerPulled }), lettering);
const rocker = (face: string, ...title: string[]) =>
  lettered(positions(face, { off: images.rockerOff, on: images.rockerOn }), ...title, 'I', 'O');
const pushPull = positions(images.pushpullFace, {
  in: images.pushpullIn,
  pulled: images.pushpullPulled,
});
// The console is drawn from above with forward up: a lever pushed forward slides up its slot and
// one pulled toward the pilot slides down.
const forwardEnd = { x: 56, y: 70 } as const;
const aftEnd = { x: 56, y: 260 } as const;
const pullSlide = [forwardEnd, aftEnd] as const;

export const controlArtwork = {
  comBreaker: breaker(images.breakerCom, 'COM'),
  xpdrBreaker: breaker(images.breakerXpdr, 'XPDR'),
  gpsBreaker: breaker(images.breakerGps, 'GPS'),
  positionBreaker: breaker(images.breakerPosition, 'POS'),
  strobeBreaker: breaker(images.breakerStrobe, 'STRB'),
  landingBreaker: breaker(images.breakerLanding, 'LDG'),
  intercomBreaker: breaker(images.breakerIntercom, 'INT'),
  outletBreaker: breaker(images.breakerOutlet, '12 V'),
  flapBreaker: lettered(
    positions(images.breakerFlap, {
      in: images.breakerFlapIn,
      pulled: images.breakerFlapPulled,
    }),
    'FLAP',
  ),
  avionicsMaster: lettered(
    positions(images.rockerAvionics, {
      off: images.rockerMasterOff,
      on: images.rockerMasterOn,
    }),
    'AVIONICS',
    'I',
    'O',
  ),
  beacon: rocker(images.rockerBeacon, 'Beacon', 'Light'),
  positionLights: rocker(images.rockerPosition, 'Position', 'Light'),
  intercom: rocker(images.rockerIntercom, 'Intercom'),
  cockpitLight: rocker(images.rockerCockpit, 'Cockpit', 'Light'),
  landingLight: rocker(images.rockerLanding, 'Landing', 'Light'),
  // Open, the handle stands up in its slot clear of the key switch below, so only the slot takes a
  // tap; closed, the whole box does, its handle over the key slot.
  fuelValve: {
    ...positions(images.fuelValveFace, {
      open: images.fuelValveOpen,
      closed: images.fuelValveClosed,
    }),
    options: { hitArea: { open: { left: 0, top: 0, width: 1, height: 0.56 } } },
  },
  elt: lettered(
    positions(images.eltFace, { armed: images.eltArmed, on: images.eltOn }),
    'ELT',
    'ON',
    'ARM',
  ),
  parkingBrakeValve: lettered(
    positions(images.valveFace, {
      open: images.valveOpen,
      closed: images.valveClosed,
    }),
    'Brake',
    'Off',
    'On',
  ),
  flapSelector: lettered(
    positions(images.flapSelectorFace, {
      'override-up': images.flapKnob0,
      '-12': images.flapKnob1,
      '0': images.flapKnob2,
      '15': images.flapKnob3,
      '30': images.flapKnob4,
      '35': images.flapKnob5,
      'override-down': images.flapKnob6,
    }),
    'FLAPS',
    'up manually',
    '-12',
    '0',
    '15',
    '30',
    '35',
    'down manually',
  ),
  ignition: lettered(
    positions(images.ignitionFace, {
      out: images.ignitionKeyOut,
      off: images.ignitionKeyOff,
      left: images.ignitionKeyL,
      right: images.ignitionKeyR,
      both: images.ignitionKeyBoth,
      start: images.ignitionKeyStart,
    }),
    'OFF',
    '1',
    '2',
    '1+2',
    'START',
  ),
  battery: pushPull,
  generator: pushPull,
  brake: lettered(
    travel(images.leverBrakeFace, images.handleBrake, pullSlide),
    'Brake',
    'OFF',
    'ON',
  ),
  choke: lettered(
    travel(images.leverChokeFace, images.handleBrake, pullSlide),
    'Choke',
    'OFF',
    'ON',
  ),
  throttle: lettered(
    travel(images.leverThrottleFace, images.handleThrottle, [aftEnd, forwardEnd]),
    'Throttle',
    'FULL',
    'IDLE',
  ),
  carbHeat: lettered(
    travel(images.leverCarbFace, images.handleCarb, [
      { x: 75, y: 107 },
      { x: 75, y: 227 },
    ]),
    'CARB HEAT',
    'OFF',
    'ON',
  ),
  trim: lettered(
    travel(images.trimWheelFace, images.trimPointer, [
      { x: 104, y: 70 },
      { x: 104, y: 260 },
    ]),
    'Stabilator Trim',
    'DOWN',
    'UP',
  ),
  rescueHandle: lettered(
    {
      artwork: {
        ...positions(images.rescueFace, {
          stowed: images.rescueStowed,
          pulled: images.rescuePulled,
        }).artwork,
        guardOpen: { stowed: images.rescueStowedOpen },
      },
    },
    'RESCUE',
  ),
} as const satisfies Record<string, ArtworkAppearance>;

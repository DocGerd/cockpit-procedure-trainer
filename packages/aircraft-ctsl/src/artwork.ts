import type { ArtworkAppearance, Point } from '@cpt/core';

export const images = {
  gaugeAirspeed: new URL('./assets/artwork/gauge-airspeed.svg', import.meta.url).href,
  gaugeAltimeter: new URL('./assets/artwork/gauge-altimeter.svg', import.meta.url).href,
  gaugeVsi: new URL('./assets/artwork/gauge-vsi.svg', import.meta.url).href,
  gaugeTachometer: new URL('./assets/artwork/gauge-tachometer.svg', import.meta.url).href,
  gaugeOilPressure: new URL('./assets/artwork/gauge-oil-pressure.svg', import.meta.url).href,
  gaugeOilTemperature: new URL('./assets/artwork/gauge-oil-temperature.svg', import.meta.url).href,
  gaugeCht: new URL('./assets/artwork/gauge-cht.svg', import.meta.url).href,
  needle: new URL('./assets/artwork/needle.svg', import.meta.url).href,
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
  leverTrimFace: new URL('./assets/artwork/lever-trim-face.svg', import.meta.url).href,
  handleTrim: new URL('./assets/artwork/handle-trim.svg', import.meta.url).href,
  flapSelectorFace: new URL('./assets/artwork/flap-selector-face.svg', import.meta.url).href,
  flapKnob0: new URL('./assets/artwork/flap-knob-0.svg', import.meta.url).href,
  flapKnob1: new URL('./assets/artwork/flap-knob-1.svg', import.meta.url).href,
  flapKnob2: new URL('./assets/artwork/flap-knob-2.svg', import.meta.url).href,
  flapKnob3: new URL('./assets/artwork/flap-knob-3.svg', import.meta.url).href,
  flapKnob4: new URL('./assets/artwork/flap-knob-4.svg', import.meta.url).href,
  flapKnob5: new URL('./assets/artwork/flap-knob-5.svg', import.meta.url).href,
  flapKnob6: new URL('./assets/artwork/flap-knob-6.svg', import.meta.url).href,
  ignitionFace: new URL('./assets/artwork/ignition-face.svg', import.meta.url).href,
  ignitionKeyOff: new URL('./assets/artwork/ignition-key-off.svg', import.meta.url).href,
  ignitionKeyL: new URL('./assets/artwork/ignition-key-l.svg', import.meta.url).href,
  ignitionKeyR: new URL('./assets/artwork/ignition-key-r.svg', import.meta.url).href,
  ignitionKeyBoth: new URL('./assets/artwork/ignition-key-both.svg', import.meta.url).href,
  ignitionKeyStart: new URL('./assets/artwork/ignition-key-start.svg', import.meta.url).href,
  rescueFace: new URL('./assets/artwork/rescue-face.svg', import.meta.url).href,
  rescueStowed: new URL('./assets/artwork/rescue-stowed.svg', import.meta.url).href,
  rescuePulled: new URL('./assets/artwork/rescue-pulled.svg', import.meta.url).href,
} as const;

const needle = (
  face: string,
  valueRange: { min: number; max: number },
  angleRange = { min: -135, max: 135 },
): ArtworkAppearance => ({
  artwork: {
    face,
    moving: {
      type: 'needle',
      image: images.needle,
      pivot: { x: 100, y: 100 },
      angleRange,
      valueRange,
    },
  },
});

const positions = (face: string, moving: Record<string, string>): ArtworkAppearance => ({
  artwork: { face, moving: { type: 'positions', images: moving } },
});

const travel = (face: string, image: string, path: readonly Point[]): ArtworkAppearance => ({
  artwork: { face, moving: { type: 'travel', image, path } },
});

export const gaugeArtwork = {
  airspeed: needle(images.gaugeAirspeed, { min: 40, max: 300 }),
  altimeter: needle(images.gaugeAltimeter, { min: 0, max: 5000 }),
  verticalSpeed: needle(images.gaugeVsi, { min: -5, max: 5 }, { min: -225, max: 45 }),
  tachometer: needle(images.gaugeTachometer, { min: 0, max: 7000 }),
  oilPressure: needle(images.gaugeOilPressure, { min: 0, max: 10 }),
  oilTemperature: needle(images.gaugeOilTemperature, { min: 40, max: 150 }),
  cht: needle(images.gaugeCht, { min: 40, max: 150 }),
} as const;

const breaker = (face: string) =>
  positions(face, { in: images.breakerIn, pulled: images.breakerPulled });
const rocker = (face: string) => positions(face, { off: images.rockerOff, on: images.rockerOn });
const pushPull = positions(images.pushpullFace, {
  in: images.pushpullIn,
  pulled: images.pushpullPulled,
});
const brakeSlide = [
  { x: 70, y: 110 },
  { x: 70, y: 300 },
] as const;

export const controlArtwork = {
  comBreaker: breaker(images.breakerCom),
  xpdrBreaker: breaker(images.breakerXpdr),
  gpsBreaker: breaker(images.breakerGps),
  positionBreaker: breaker(images.breakerPosition),
  strobeBreaker: breaker(images.breakerStrobe),
  landingBreaker: breaker(images.breakerLanding),
  intercomBreaker: breaker(images.breakerIntercom),
  outletBreaker: breaker(images.breakerOutlet),
  flapBreaker: positions(images.breakerFlap, {
    in: images.breakerFlapIn,
    pulled: images.breakerFlapPulled,
  }),
  avionicsMaster: positions(images.rockerAvionics, {
    off: images.rockerMasterOff,
    on: images.rockerMasterOn,
  }),
  beacon: rocker(images.rockerBeacon),
  positionLights: rocker(images.rockerPosition),
  intercom: rocker(images.rockerIntercom),
  cockpitLight: rocker(images.rockerCockpit),
  landingLight: rocker(images.rockerLanding),
  fuelValve: positions(images.fuelValveFace, {
    open: images.fuelValveOpen,
    closed: images.fuelValveClosed,
  }),
  parkingBrakeValve: positions(images.valveFace, {
    open: images.valveOpen,
    closed: images.valveClosed,
  }),
  flapSelector: positions(images.flapSelectorFace, {
    'override-up': images.flapKnob0,
    '-12': images.flapKnob1,
    '0': images.flapKnob2,
    '15': images.flapKnob3,
    '30': images.flapKnob4,
    '35': images.flapKnob5,
    'override-down': images.flapKnob6,
  }),
  ignition: positions(images.ignitionFace, {
    off: images.ignitionKeyOff,
    left: images.ignitionKeyL,
    right: images.ignitionKeyR,
    both: images.ignitionKeyBoth,
    start: images.ignitionKeyStart,
  }),
  battery: pushPull,
  generator: pushPull,
  brake: travel(images.leverBrakeFace, images.handleBrake, brakeSlide),
  choke: travel(images.leverChokeFace, images.handleBrake, brakeSlide),
  throttle: travel(images.leverThrottleFace, images.handleThrottle, [
    { x: 34, y: 300 },
    { x: 34, y: 110 },
  ]),
  carbHeat: travel(images.leverCarbFace, images.handleCarb, [
    { x: 75, y: 95 },
    { x: 75, y: 235 },
  ]),
  trim: travel(images.leverTrimFace, images.handleTrim, [
    { x: 44, y: 70 },
    { x: 44, y: 210 },
  ]),
  rescueHandle: positions(images.rescueFace, {
    stowed: images.rescueStowed,
    pulled: images.rescuePulled,
  }),
} as const satisfies Record<string, ArtworkAppearance>;

import { defineAircraft } from '@cpt/core';
import type { Environment } from '@cpt/core';
import { images } from './assets';
import { controls } from './controls';
import { indicators } from './indicators';
import { initial, lowVoltageLit, runningFrom, step } from './systems';
import type { DemoFailure } from './systems';
import { text } from './text';

const parked = {
  battery: 'off',
  alternator: 'off',
  avionics: 'off',
  magnetos: 'off',
  starter: 'released',
  annunciator: 'bright',
  fuelSelector: 'off',
  throttle: 0,
  mixture: 0,
  flaps: 'up',
  fuelShutoff: 'open',
  alternatorBreaker: 'in',
  avionicsBreaker: 'in',
} as const;

const idling = {
  ...parked,
  battery: 'on',
  alternator: 'on',
  avionics: 'on',
  magnetos: 'both',
  fuelSelector: 'both',
  mixture: 1,
} as const;

const departing = { ...idling, throttle: 1, flaps: 'takeoff' } as const;
const cruising = { ...idling, throttle: 0.7 } as const;

const ground = (): Environment => ({ airspeedKt: 0, altitudeFt: 0, onGround: true });

export const demoAircraft = defineAircraft({
  id: 'demo',
  name: text('Demo-Flugzeug', 'Demo aircraft'),
  handbookRevision: 'fictional aircraft; no handbook',
  controls,
  indicators,
  views: {
    panel: {
      name: text('Instrumententafel', 'Panel'),
      image: images.panel,
      controls: {
        battery: { rect: { x: 50, y: 370, w: 110, h: 190 } },
        alternator: { rect: { x: 170, y: 370, w: 110, h: 190 } },
        avionics: { rect: { x: 290, y: 370, w: 110, h: 190 } },
        annunciator: { rect: { x: 410, y: 370, w: 110, h: 190 } },
        magnetos: { rect: { x: 530, y: 370, w: 130, h: 190 } },
        starter: { rect: { x: 680, y: 370, w: 120, h: 190 } },
        alternatorBreaker: { rect: { x: 890, y: 380, w: 100, h: 170 } },
        avionicsBreaker: { rect: { x: 1030, y: 380, w: 100, h: 170 } },
      },
      indicators: {
        tachometer: { rect: { x: 50, y: 50, w: 240, h: 240 } },
        oilPressure: { rect: { x: 310, y: 50, w: 240, h: 240 } },
        ammeter: { rect: { x: 570, y: 50, w: 240, h: 240 } },
        hourMeter: { rect: { x: 870, y: 50, w: 280, h: 112 } },
        lowVoltageLamp: { rect: { x: 870, y: 190, w: 135, h: 68 } },
        oilPressureLamp: { rect: { x: 1015, y: 190, w: 135, h: 68 } },
      },
    },
    console: {
      name: text('Mittelkonsole', 'Centre console'),
      image: images.console,
      controls: {
        throttle: { rect: { x: 60, y: 60, w: 150, h: 440 } },
        mixture: { rect: { x: 230, y: 60, w: 150, h: 440 } },
        flaps: { rect: { x: 400, y: 60, w: 160, h: 440 } },
        fuelSelector: { rect: { x: 625, y: 60, w: 130, h: 200 } },
        fuelShutoff: { rect: { x: 625, y: 300, w: 130, h: 200 } },
      },
    },
  },
  systems: { initial, step },
  failures: {
    alternatorFailure: {
      name: text('Generatorausfall', 'Alternator failure'),
      trips: ['alternatorBreaker'],
    },
  },
  phases: {
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
      entry: { controls: idling, state: runningFrom(idling) },
    },
    departure: {
      name: text('Abflug', 'Departure'),
      image: images.departure,
      environment: { airspeedKt: 75, altitudeFt: 800, onGround: false },
      entry: { controls: departing, state: runningFrom(departing) },
    },
    cruise: {
      name: text('Reiseflug', 'Cruise'),
      image: images.cruise,
      environment: { airspeedKt: 105, altitudeFt: 4500, onGround: false },
      entry: { controls: cruising, state: runningFrom(cruising) },
    },
  },
  procedures: {
    engineStart: {
      title: text('Triebwerk anlassen', 'Engine start'),
      type: 'normal',
      startPhase: 'parking',
      items: [
        {
          type: 'confirm',
          text: text(
            'Rundgang beendet, Propellerbereich frei',
            'Walk-around done, propeller area clear',
          ),
        },
        {
          type: 'check',
          target: { control: 'fuelShutoff' },
          condition: (state) => state.controls.fuelShutoff === 'open',
          text: text('Kraftstoff-Absperrhahn offen', 'Fuel shut-off open'),
        },
        {
          type: 'action',
          control: 'fuelSelector',
          position: 'both',
          text: text('Tankwahlschalter auf BOTH', 'Fuel selector BOTH'),
        },
        {
          type: 'action',
          control: 'mixture',
          position: 1,
          text: text('Gemisch fett', 'Mixture rich'),
        },
        {
          type: 'action',
          control: 'battery',
          position: 'on',
          text: text('Batterie EIN', 'Battery master ON'),
        },
        {
          type: 'action',
          control: 'alternator',
          position: 'on',
          text: text('Generator EIN', 'Alternator ON'),
        },
        {
          type: 'action',
          control: 'annunciator',
          position: 'test',
          text: text('Warnlampen auf TEST halten', 'Hold the annunciator switch at TEST'),
        },
        {
          type: 'confirm',
          text: text('Beide Warnlampen leuchten', 'Both annunciator lamps light'),
        },
        {
          type: 'action',
          control: 'magnetos',
          position: 'both',
          text: text('Zündschalter auf BOTH', 'Magneto key BOTH'),
        },
        {
          type: 'action',
          control: 'starter',
          position: 'held',
          holdUntil: (state) => state.systems.engine.running,
          text: text(
            'Anlasser halten, bis das Triebwerk läuft',
            'Hold the starter until the engine runs',
          ),
        },
        {
          type: 'check',
          target: { indicator: 'oilPressure' },
          condition: (state) => state.systems.oilPsi >= 40,
          text: text('Öldruck im grünen Bereich', 'Oil pressure in the green'),
        },
        {
          type: 'check',
          target: { indicator: 'ammeter' },
          condition: (state) => state.systems.amps > 0,
          text: text('Amperemeter zeigt Ladung', 'Ammeter shows charge'),
        },
        {
          type: 'action',
          control: 'avionics',
          position: 'on',
          text: text('Avionik EIN', 'Avionics master ON'),
        },
      ],
    },
    beforeTakeoff: {
      title: text('Vor dem Start', 'Before take-off'),
      type: 'normal',
      startPhase: 'holding',
      items: [
        {
          type: 'check',
          target: { indicator: 'tachometer' },
          condition: (state) => state.systems.rpm >= 600 && state.systems.rpm <= 900,
          text: text('Leerlauf ruhig, 600 bis 900 U/min', 'Idle is steady, 600 to 900 rpm'),
        },
        {
          type: 'check',
          target: { indicator: 'lowVoltageLamp' },
          condition: (state) => !lowVoltageLit(state),
          text: text('Spannungslampe aus', 'Low-voltage lamp is out'),
        },
        {
          type: 'action',
          control: 'throttle',
          position: 1,
          text: text('Leistungshebel auf Vollgas', 'Throttle full'),
        },
        {
          type: 'action',
          control: 'magnetos',
          position: 'right',
          text: text('Zündschalter auf RIGHT', 'Magneto key RIGHT'),
        },
        {
          type: 'check',
          target: { indicator: 'tachometer' },
          condition: (state) => state.systems.rpm >= 2350,
          text: text('Drehzahlabfall höchstens 150 U/min', 'Rpm drop is no more than 150'),
        },
        {
          type: 'action',
          control: 'magnetos',
          position: 'left',
          text: text('Zündschalter auf LEFT', 'Magneto key LEFT'),
        },
        {
          type: 'check',
          target: { indicator: 'tachometer' },
          condition: (state) => state.systems.rpm >= 2350,
          text: text('Drehzahlabfall höchstens 150 U/min', 'Rpm drop is no more than 150'),
        },
        {
          type: 'action',
          control: 'magnetos',
          position: 'both',
          text: text('Zündschalter auf BOTH', 'Magneto key BOTH'),
        },
        {
          type: 'action',
          control: 'throttle',
          position: 0,
          text: text('Leistungshebel auf Leerlauf', 'Throttle idle'),
        },
        {
          type: 'action',
          control: 'flaps',
          position: 'takeoff',
          text: text('Klappen auf TAKEOFF', 'Flaps TAKEOFF'),
        },
        {
          type: 'confirm',
          text: text(
            'Türen verriegelt, Gurte fest, Steuerung frei',
            'Doors latched, harnesses tight, controls free',
          ),
        },
      ],
    },
    alternatorFailure: {
      title: text('Generatorausfall', 'Alternator failure'),
      type: 'emergency',
      failure: 'alternatorFailure' satisfies DemoFailure,
      startPhase: 'cruise',
      items: [
        {
          type: 'check',
          target: { indicator: 'lowVoltageLamp' },
          condition: lowVoltageLit,
          text: text('Spannungslampe leuchtet', 'Low-voltage lamp is lit'),
        },
        {
          type: 'check',
          target: { indicator: 'ammeter' },
          condition: (state) => state.systems.amps < 0,
          text: text('Amperemeter zeigt Entladung', 'Ammeter shows discharge'),
        },
        {
          type: 'action',
          control: 'alternatorBreaker',
          position: 'in',
          text: text('Generatorsicherung einmal eindrücken', 'Push the alternator breaker in once'),
        },
        {
          type: 'check',
          target: { indicator: 'lowVoltageLamp' },
          condition: lowVoltageLit,
          text: text(
            'Lampe leuchtet weiter: Generator bleibt ausgefallen',
            'Lamp stays lit: the alternator stays failed',
          ),
        },
        {
          type: 'action',
          control: 'alternator',
          position: 'off',
          text: text('Generator AUS', 'Alternator OFF'),
        },
        {
          type: 'action',
          control: 'avionics',
          position: 'off',
          text: text('Avionik AUS, um die Batterie zu schonen', 'Avionics OFF to save the battery'),
        },
        {
          type: 'confirm',
          text: text('Baldmöglichst landen', 'Land as soon as practical'),
        },
      ],
    },
  },
});

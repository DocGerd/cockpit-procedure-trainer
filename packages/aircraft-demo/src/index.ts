import { defineAircraft } from '@cpt/core';
import type { Environment, PhaseId, Placement } from '@cpt/core';
import { images } from './assets';
import { cockpit } from './cockpit';
import { controls } from './controls';
import { headingLabel, phaseHeadings, runway } from './airfield';
import { indicators } from './indicators';
import {
  carry,
  engineRunning,
  initial,
  lampTestDone,
  lowVoltageLit,
  runningFrom,
  step,
} from './systems';
import type { DemoFailure, DemoState, DemoTrainerState } from './systems';
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

const linedUpControls = { ...idling, flaps: 'takeoff' } as const;
const departing = { ...idling, throttle: 1, flaps: 'takeoff' } as const;
const cruising = { ...idling, throttle: 0.7 } as const;
const approaching = { ...idling, throttle: 0.4, mixture: 0.8 } as const;
const flaring = { ...idling, flaps: 'landing' } as const;
const taxiingOut = { ...idling, throttle: 0.15 } as const;
const taxiingIn = { ...idling, throttle: 0.15, flaps: 'landing' } as const;

const ground = (): Environment => ({ airspeedKt: 0, altitudeFt: 0, onGround: true });
const departureEnvironment: Environment = { airspeedKt: 75, altitudeFt: 800, onGround: false };
const cruiseEnvironment: Environment = { airspeedKt: 105, altitudeFt: 4500, onGround: false };
const approachEnvironment: Environment = { airspeedKt: 85, altitudeFt: 1000, onGround: false };
const landingEnvironment: Environment = { airspeedKt: 60, altitudeFt: 10, onGround: false };

type ComReading = { readonly active: number; readonly standby: number };
type TransponderReading = {
  readonly mode: string;
  readonly squawk: string;
  readonly altitude: number | null;
};

const radio = (state: DemoTrainerState) => state.devices.radio?.state as ComReading | undefined;
const transponder = (state: DemoTrainerState) =>
  state.devices.xpdr?.state as TransponderReading | undefined;

// Each slot is a 520 by 150 recess drawn on the panel backdrop; its device mirrors there.
const deviceSlots = {
  radio: { rect: { x: 194, y: 604, w: 520, h: 150 } },
  xpdr: { rect: { x: 734, y: 604, w: 520, h: 150 } },
} as const satisfies Record<string, Placement>;

const avionicsPowered = (state: DemoTrainerState) => state.systems.avionicsPowered;
const pressureAltitude = (state: DemoTrainerState) => state.systems.altitudeFt;

const facing = (phase: PhaseId, state: DemoState): DemoState => ({
  ...state,
  headingDeg: phaseHeadings[phase],
});

export const demoAircraft = defineAircraft({
  id: 'demo',
  name: text('Demo-Flugzeug', 'Demo aircraft'),
  handbookRevision: text('Fiktives Flugzeug; kein Handbuch', 'fictional aircraft; no handbook'),
  controls,
  indicators,
  views: {
    panel: {
      name: text('Instrumententafel', 'Panel'),
      image: images.panel,
      size: { width: 1406, height: 784 },
      controls: {
        battery: { rect: { x: 34, y: 329, w: 110, h: 210 } },
        alternator: { rect: { x: 146, y: 329, w: 110, h: 210 } },
        avionics: { rect: { x: 258, y: 333, w: 118, h: 210 } },
        annunciator: { rect: { x: 410, y: 324, w: 100, h: 210 } },
        starter: { rect: { x: 544, y: 333, w: 118, h: 210 } },
        magnetos: { rect: { x: 688, y: 303, w: 270, h: 270 } },
        alternatorBreaker: { rect: { x: 978, y: 321, w: 196, h: 235 } },
        avionicsBreaker: { rect: { x: 1174, y: 321, w: 196, h: 235 } },
      },
      indicators: {
        tachometer: { rect: { x: 45, y: 40, w: 230, h: 230 } },
        oilPressure: { rect: { x: 330, y: 40, w: 230, h: 230 } },
        ammeter: { rect: { x: 615, y: 40, w: 230, h: 230 } },
        hourMeter: { rect: { x: 910, y: 40, w: 220, h: 120 } },
        compass: { rect: { x: 1140, y: 40, w: 220, h: 120 } },
        lowVoltageLamp: { rect: { x: 915, y: 170, w: 210, h: 90 } },
        oilPressureLamp: { rect: { x: 1150, y: 170, w: 210, h: 90 } },
      },
    },
    console: {
      name: text('Mittelkonsole', 'Centre console'),
      image: images.console,
      size: { width: 800, height: 560 },
      controls: {
        throttle: { rect: { x: 60, y: 60, w: 150, h: 440 } },
        mixture: { rect: { x: 230, y: 60, w: 150, h: 440 } },
        flaps: { rect: { x: 400, y: 60, w: 160, h: 440 } },
        fuelSelector: { rect: { x: 625, y: 60, w: 130, h: 200 } },
        fuelShutoff: { rect: { x: 625, y: 300, w: 130, h: 200 } },
      },
    },
  },
  cockpit,
  devices: {
    radio: {
      device: 'com',
      view: 'panel',
      placement: deviceSlots.radio,
      powered: avionicsPowered,
      inputs: {},
    },
    xpdr: {
      device: 'transponder',
      view: 'panel',
      placement: deviceSlots.xpdr,
      powered: avionicsPowered,
      inputs: { pressureAltitude },
    },
  },
  systems: { initial, step, carry },
  engineRunning,
  failures: {
    alternatorFailure: {
      name: text('Generatorausfall', 'Alternator failure'),
      trips: ['alternatorBreaker'],
    },
  },
  phases: {
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
      entry: { controls: idling, state: facing('holding', runningFrom(idling)) },
    },
    linedUp: {
      image: images.linedUp,
      imageRunning: images.linedUpRunning,
      environment: ground(),
      entry: { controls: linedUpControls, state: facing('linedUp', runningFrom(linedUpControls)) },
    },
    departure: {
      image: images.departure,
      imageRunning: images.departureRunning,
      environment: departureEnvironment,
      entry: {
        controls: departing,
        state: facing('departure', runningFrom(departing, departureEnvironment)),
      },
    },
    cruise: {
      image: images.cruise,
      imageRunning: images.cruiseRunning,
      environment: cruiseEnvironment,
      entry: {
        controls: cruising,
        state: facing('cruise', runningFrom(cruising, cruiseEnvironment)),
      },
    },
    approach: {
      image: images.approach,
      imageRunning: images.approachRunning,
      environment: approachEnvironment,
      entry: {
        controls: approaching,
        state: facing('approach', runningFrom(approaching, approachEnvironment)),
      },
    },
    landing: {
      image: images.landing,
      imageRunning: images.landingRunning,
      environment: landingEnvironment,
      entry: {
        controls: flaring,
        state: facing('landing', runningFrom(flaring, landingEnvironment)),
      },
    },
    taxiIn: {
      image: images.taxiIn,
      imageRunning: images.taxiInRunning,
      environment: ground(),
      entry: { controls: taxiingIn, state: facing('taxiIn', runningFrom(taxiingIn)) },
    },
    parkingSecuring: {
      image: images.parkingSecuring,
      imageRunning: images.parkingSecuringRunning,
      environment: ground(),
      entry: { controls: idling, state: facing('parkingSecuring', runningFrom(idling)) },
    },
  },
  procedures: {
    engineStart: {
      title: text('Triebwerk anlassen', 'Engine start'),
      type: 'normal',
      startPhase: 'parking',
      endPhase: 'taxiOut',
      items: [
        {
          type: 'confirm',
          text: text(
            'Außenkontrolle beendet, Propellerbereich frei',
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
          holdUntil: lampTestDone,
          text: text(
            'Warnlampen auf TEST halten, bis der Lampentest durch ist',
            'Hold the annunciator switch at TEST until the lamp test is done',
          ),
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
    takeoff: {
      title: text('Startlauf', 'Take-off roll'),
      type: 'normal',
      startPhase: 'linedUp',
      endPhase: 'departure',
      items: [
        {
          type: 'confirm',
          text: text(
            `Auf der Mittellinie der Piste ${runway.designator} ausgerichtet`,
            `Lined up on the centreline of runway ${runway.designator}`,
          ),
        },
        {
          type: 'confirm',
          text: text(
            `Kompass zeigt ${headingLabel(runway.headingDeg)}°, die Richtung der Piste ${runway.designator}`,
            `Compass reads ${headingLabel(runway.headingDeg)}°, the heading of runway ${runway.designator}`,
          ),
        },
        {
          type: 'action',
          control: 'throttle',
          position: 1,
          text: text('Leistungshebel auf Vollgas', 'Throttle full'),
        },
        {
          type: 'check',
          target: { indicator: 'tachometer' },
          condition: (state) => state.systems.rpm >= 2350,
          text: text('Volle Drehzahl erreicht', 'Full rpm reached'),
        },
      ],
    },
    radioAndTransponder: {
      title: text('Funk und Transponder', 'Radio and transponder'),
      type: 'normal',
      startPhase: 'holding',
      items: [
        {
          type: 'check',
          target: { control: 'avionics' },
          condition: (state) => state.devices.radio?.on === true && state.devices.xpdr?.on === true,
          text: text(
            'Funkgerät und Transponder sind eingeschaltet',
            'Radio and transponder are on',
          ),
        },
        {
          type: 'action',
          control: 'radio.coarse',
          position: 'up',
          text: text(
            'Bereitschaftsfrequenz um 1 MHz erhöhen',
            'Raise the standby frequency by 1 MHz',
          ),
        },
        {
          type: 'check',
          target: { control: 'radio.coarse' },
          condition: (state) => radio(state)?.standby === 120000,
          text: text('Bereitschaftsfrequenz 120,000 MHz', 'Standby frequency is 120.000 MHz'),
        },
        {
          type: 'action',
          control: 'radio.swap',
          position: 'pressed',
          text: text('Frequenzen tauschen', 'Swap the frequencies'),
        },
        {
          type: 'check',
          target: { control: 'radio.swap' },
          condition: (state) => radio(state)?.active === 120000,
          text: text('Aktive Frequenz 120,000 MHz', 'Active frequency is 120.000 MHz'),
        },
        {
          type: 'action',
          control: 'xpdr.code1',
          position: '1',
          text: text('Transpondercode, erste Ziffer 1', 'Transponder code, first digit 1'),
        },
        {
          type: 'action',
          control: 'xpdr.code2',
          position: '2',
          text: text('Transpondercode, zweite Ziffer 2', 'Transponder code, second digit 2'),
        },
        {
          type: 'action',
          control: 'xpdr.mode',
          position: 'alt',
          text: text('Transponder auf ALT', 'Transponder mode ALT'),
        },
        {
          type: 'check',
          target: { control: 'xpdr.mode' },
          condition: (state) => {
            const reading = transponder(state);
            return reading?.squawk === '1200' && reading.altitude !== null;
          },
          text: text(
            'Code 1200, die Höhe wird gemeldet',
            'Code 1200 is set and the altitude is reported',
          ),
        },
      ],
    },
    beforeLanding: {
      title: text('Vor der Landung', 'Before landing'),
      type: 'normal',
      startPhase: 'approach',
      items: [
        {
          type: 'action',
          flow: true,
          control: 'fuelSelector',
          position: 'both',
          text: text('Tankwahlschalter auf BOTH', 'Fuel selector BOTH'),
        },
        {
          type: 'action',
          flow: true,
          control: 'mixture',
          position: 1,
          text: text('Gemisch fett', 'Mixture rich'),
        },
        {
          type: 'action',
          flow: true,
          control: 'flaps',
          position: 'takeoff',
          text: text('Klappen auf TAKEOFF', 'Flaps TAKEOFF'),
        },
        {
          type: 'confirm',
          text: text(
            'Sitze verriegelt, Gurte fest, Türen verriegelt',
            'Seats locked, harnesses tight, doors latched',
          ),
        },
        {
          type: 'check',
          target: { control: 'fuelSelector' },
          condition: (state) => state.controls.fuelSelector === 'both',
          text: text('Tankwahlschalter auf BOTH', 'Fuel selector is on BOTH'),
        },
        {
          type: 'action',
          control: 'mixture',
          position: 1,
          text: text('Gemisch fett', 'Mixture rich'),
        },
        {
          type: 'check',
          target: { indicator: 'oilPressure' },
          condition: (state) => state.systems.oilPsi >= 40 && state.systems.oilPsi <= 85,
          text: text('Öldruck im grünen Bereich', 'Oil pressure in the green'),
        },
        {
          type: 'confirm',
          text: text('Landescheinwerfer EIN', 'Landing light ON'),
        },
        {
          type: 'action',
          control: 'flaps',
          position: 'takeoff',
          text: text('Klappen auf TAKEOFF, erste Stufe', 'Flaps TAKEOFF, first stage'),
        },
        {
          type: 'action',
          control: 'flaps',
          position: 'landing',
          text: text('Klappen im Endanflug auf LANDING', 'Flaps LANDING on final'),
        },
        {
          type: 'confirm',
          text: text('Landefreigabe erhalten, Piste frei', 'Cleared to land, runway clear'),
        },
      ],
    },
    afterLanding: {
      title: text('Nach der Landung', 'After landing'),
      type: 'normal',
      startPhase: 'taxiIn',
      items: [
        {
          type: 'confirm',
          text: text(
            'Piste verlassen, hinter der Haltelinie',
            'Runway vacated, clear of the holding line',
          ),
        },
        {
          type: 'action',
          control: 'flaps',
          position: 'up',
          text: text('Klappen auf UP', 'Flaps UP'),
        },
        {
          type: 'confirm',
          text: text('Landescheinwerfer AUS', 'Landing light OFF'),
        },
        {
          type: 'check',
          target: { indicator: 'tachometer' },
          condition: (state) => state.systems.rpm > 0 && state.systems.rpm <= 1200,
          text: text('Rollleistung, höchstens 1200 U/min', 'Taxi power, no more than 1200 rpm'),
        },
        {
          type: 'confirm',
          text: text(
            'Rollfreigabe zum Abstellplatz erhalten',
            'Taxi clearance to the parking position received',
          ),
        },
      ],
    },
    shutdownSecuring: {
      title: text('Triebwerk abstellen und sichern', 'Engine shutdown and securing'),
      type: 'normal',
      startPhase: 'parkingSecuring',
      items: [
        {
          type: 'check',
          target: { control: 'throttle' },
          condition: (state) => state.controls.throttle === 0,
          text: text('Leistungshebel auf Leerlauf', 'Throttle is at idle'),
        },
        {
          type: 'action',
          control: 'avionics',
          position: 'off',
          text: text('Avionik AUS', 'Avionics master OFF'),
        },
        {
          type: 'action',
          control: 'mixture',
          position: 0,
          text: text('Gemisch auf Leerlaufabschaltung', 'Mixture idle cut-off'),
        },
        {
          type: 'check',
          target: { indicator: 'tachometer' },
          condition: (state) => !state.systems.engine.running && state.systems.rpm === 0,
          text: text('Triebwerk steht', 'Engine has stopped'),
        },
        {
          type: 'action',
          control: 'magnetos',
          position: 'off',
          text: text('Zündschalter AUS, Schlüssel abziehen', 'Magneto key OFF, key removed'),
        },
        {
          type: 'confirm',
          text: text('Beleuchtung AUS', 'Lights OFF'),
        },
        {
          type: 'action',
          control: 'alternator',
          position: 'off',
          text: text('Generator AUS', 'Alternator OFF'),
        },
        {
          type: 'action',
          control: 'battery',
          position: 'off',
          text: text('Batterie AUS', 'Battery master OFF'),
        },
        {
          type: 'action',
          control: 'fuelSelector',
          position: 'off',
          text: text('Tankwahlschalter auf OFF', 'Fuel selector OFF'),
        },
        {
          type: 'confirm',
          text: text(
            'Steuersperre gesteckt, Bremsklötze vorgelegt, Flugzeug gesichert',
            'Control lock fitted, chocks in place, aircraft secured',
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
          memory: true,
          target: { indicator: 'lowVoltageLamp' },
          condition: lowVoltageLit,
          text: text('Spannungslampe leuchtet', 'Low-voltage lamp is lit'),
        },
        {
          type: 'check',
          memory: true,
          target: { indicator: 'ammeter' },
          condition: (state) => state.systems.amps < 0,
          text: text('Amperemeter zeigt Entladung', 'Ammeter shows discharge'),
        },
        {
          type: 'action',
          memory: true,
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

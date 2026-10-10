import type { PositionOf } from '@cpt/core';
import { headingLabel, runway } from '../airfield';
import type { controls } from '../controls';
import { chargeLampLit } from '../indicators';
import type { CtslTrainerState } from '../systems';
import { text } from '../text';
import type { CtslProcedures } from '../types';
import { field } from './avionics';

// Values: docs/aircraft/ctsl-intake.md §4.2, §4.3 and §6.
const RUNUP_RPM = 4000;
const RUNUP_RPM_TOLERANCE = 100;
const MAX_CIRCUIT_DROP_RPM = 300;
const MIN_TAKEOFF_RPM = 4600;
const RED_LINE_RPM = 5800;
const MAX_CONTINUOUS_RPM = 5500;
const OIL_PRESSURE_GREEN_BAR = [2, 5] as const;
const OIL_TEMP_GREEN_C = [90, 110] as const;
const OIL_TEMP_RED_LINE_C = 130;
const MIN_TAKEOFF_OIL_TEMP_C = 51;
const CHT_GREEN_C = [50, 120] as const;

// The trainer's own: about what a pilot reads off each scale.
const RPM_READING_TOLERANCE = 100;
const PRESSURE_READING_TOLERANCE_BAR = 0.5;
const TEMPERATURE_READING_TOLERANCE_C = 5;
const FLAP_READING_TOLERANCE = 0.5;

type State = CtslTrainerState;

const within = (value: number, [low, high]: readonly [number, number]) =>
  value >= low && value <= high;

const flapsAt = (angle: number) => (state: State) =>
  !state.systems.flaps.moving && state.systems.flaps.angle === angle;

const circuitDropWithinLimit = (state: State) =>
  state.systems.engine.running &&
  state.systems.rpm < RUNUP_RPM &&
  state.systems.rpm >= RUNUP_RPM - MAX_CIRCUIT_DROP_RPM;

const confirm = (de: string, en: string) => ({ type: 'confirm', text: text(de, en) }) as const;

const rpmReading = {
  reading: (state: State) => state.systems.rpm,
  tolerance: RPM_READING_TOLERANCE,
  unit: text('U/min', 'rpm'),
} as const;

const oilPressureReading = {
  reading: (state: State) => state.systems.oilPressureBar,
  tolerance: PRESSURE_READING_TOLERANCE_BAR,
  unit: text('bar', 'bar'),
} as const;

const temperatureReading = (reading: (state: State) => number) =>
  ({ reading, tolerance: TEMPERATURE_READING_TOLERANCE_C, unit: text('°C', '°C') }) as const;

const oilTempReading = temperatureReading((state) => state.systems.oilTempC);

const flapCheck = (angle: number) => {
  const shown = `${angle < 0 ? '−' : ''}${Math.abs(angle)}°`;
  return {
    type: 'check',
    target: { indicator: 'flapReadout' },
    condition: flapsAt(angle),
    response: {
      reading: (state: State) => state.systems.flaps.angle,
      tolerance: FLAP_READING_TOLERANCE,
      unit: text('°', '°'),
    },
    text: text('Klappenanzeige', 'Flap readout'),
    expected: text(shown, shown),
  } as const;
};

// Intake §6 N7 and N8 have no compass item, so the text marks it as the trainer's own.
const checkRunwayHeading = {
  type: 'check',
  target: { indicator: 'compass' },
  condition: (state: State) => state.systems.headingDeg === runway.headingDeg,
  text: text('Kompass (Ergänzung des Trainers)', 'Compass (trainer addition)'),
  expected: text(
    `${headingLabel(runway.headingDeg)}°, die Richtung der Piste ${runway.designator}`,
    `${headingLabel(runway.headingDeg)}°, the heading of runway ${runway.designator}`,
  ),
} as const;

// Intake §3.4: close the valve, then pull the non-locking brake lever; the valve traps the pressure.
const setParkingBrake = [
  {
    type: 'action',
    control: 'parkingBrakeValve',
    position: 'closed',
    text: text('Parkbremshebel auf On', 'Parking-brake lever On'),
  },
  {
    type: 'action',
    control: 'brake',
    position: 'on',
    holdUntil: (state: State) => state.systems.parkingBrakeSet,
    text: text('Bremshebel ziehen und halten', 'Brake lever pulled and held'),
  },
  {
    type: 'check',
    target: { control: 'brake' },
    condition: (state: State) => state.systems.parkingBrakeSet && !state.systems.brakeApplied,
    text: text('Parkbremse', 'Parking brake'),
    expected: text('hält, Bremshebel losgelassen', 'holds, brake lever released'),
  },
] as const;

const releaseParkingBrake = [
  {
    type: 'action',
    control: 'parkingBrakeValve',
    position: 'open',
    text: text('Parkbremshebel auf Off', 'Parking-brake lever Off'),
  },
  {
    type: 'check',
    target: { control: 'parkingBrakeValve' },
    condition: (state: State) => !state.systems.parkingBrakeSet,
    text: text('Parkbremse', 'Parking brake'),
    expected: text('gelöst', 'released'),
  },
] as const;

// Assumed (unverified), intake §9 question 30: the panel scans that open a procedure as a flow,
// top to bottom on the centre field, then across the console from the pilot's side and on to carb
// heat. The checklist items after them verify them.
const flow = <C extends keyof typeof controls>(
  control: C,
  position: PositionOf<(typeof controls)[C]>,
  de: string,
  en: string,
) => ({ type: 'action', flow: true, control, position, text: text(de, en) }) as const;

const oilPressureGreen = {
  type: 'check',
  target: { indicator: 'oilPressure' },
  condition: (state: State) => within(state.systems.oilPressureBar, OIL_PRESSURE_GREEN_BAR),
  response: oilPressureReading,
  text: text('Öldruck', 'Oil pressure'),
  expected: text('im grünen Bereich', 'in the green'),
} as const;

const chtGreen = {
  type: 'check',
  target: { indicator: 'cht' },
  condition: (state: State) => within(state.systems.chtC, CHT_GREEN_C),
  response: temperatureReading((state) => state.systems.chtC),
  text: text('Zylinderkopftemperatur', 'Cylinder head temperature'),
  expected: text('im grünen Bereich', 'in the green'),
} as const;

export const normalProcedures = {
  preflight: {
    title: text('Vorflugkontrolle', 'Pre-flight check'),
    type: 'normal',
    startPhase: 'parking',
    items: [
      confirm('Bordpapiere an Bord', 'Documents on board'),
      confirm('Steuerung verbunden und frei', 'Controls connected and free'),
      confirm('Flächenbolzen gesichert', 'Wing bolts secured'),
      {
        type: 'action',
        control: 'ignition',
        position: 'out',
        text: text('Zündschalter OFF, Schlüssel abgezogen', 'Ignition OFF, key out'),
      },
      {
        type: 'action',
        control: 'beacon',
        position: 'off',
        text: text('Beacon aus', 'Beacon off'),
      },
      {
        type: 'action',
        control: 'positionLights',
        position: 'off',
        text: text('Positionslichter aus', 'Position lights off'),
      },
      {
        type: 'action',
        control: 'intercom',
        position: 'off',
        text: text('Intercom aus', 'Intercom off'),
      },
      {
        type: 'action',
        control: 'cockpitLight',
        position: 'off',
        text: text('Cockpitlicht aus', 'Cockpit light off'),
      },
      {
        type: 'action',
        control: 'landingLight',
        position: 'off',
        text: text('Landelicht aus', 'Landing light off'),
      },
      {
        type: 'action',
        control: 'avionicsMaster',
        position: 'off',
        text: text('Avionik aus', 'Avionics Master off'),
      },
      {
        type: 'action',
        control: 'battery',
        position: 'in',
        text: text('Hauptschalter (BAT) eindrücken', 'BAT in'),
      },
      {
        type: 'action',
        control: 'flapSelector',
        position: '35',
        text: text(
          'Klappen zur Prüfung ganz ausfahren (35°)',
          'Flaps fully out to check them (35°)',
        ),
      },
      flapCheck(35),
      {
        type: 'action',
        control: 'flapSelector',
        position: '0',
        text: text('Klappen zurück auf 0°', 'Flaps back to 0°'),
      },
      flapCheck(0),
      {
        type: 'action',
        control: 'battery',
        position: 'pulled',
        text: text('Hauptschalter (BAT) ziehen', 'BAT out'),
      },
      {
        type: 'action',
        control: 'fuelValve',
        position: 'open',
        text: text('Brandhahn offen', 'Fuel valve open'),
      },
      confirm('Türen und Verglasung geprüft', 'Doors and glazing checked'),
      confirm('Rumpf links und Leitwerk geprüft', 'Left fuselage and tail checked'),
      confirm('Rumpf rechts geprüft', 'Right fuselage checked'),
      confirm(
        'Rechte Fläche geprüft, Kraftstoffmenge (Schauglas oder Peilstab) und Tankdeckel',
        'Right wing checked, fuel quantity (sight tube or dipstick) and cap',
      ),
      confirm(
        'Bug geprüft: Kraftstoff abgelassen (kein Wasser), Ölstand (Propeller durchdrehen, bis es gluckert), Kühlmittelstand',
        'Nose checked: fuel drained (no water), oil level (turn the prop by hand until it gurgles), coolant level',
      ),
      confirm(
        'Linke Fläche geprüft, Kraftstoffmenge und Tankdeckel',
        'Left wing checked, fuel quantity and cap',
      ),
    ],
  },
  engineStart: {
    title: text('Triebwerk anlassen', 'Engine start'),
    type: 'normal',
    startPhase: 'parking',
    endPhase: 'taxiOut',
    items: [
      flow('avionicsMaster', 'off', 'Avionik aus', 'Avionics Master off'),
      flow('beacon', 'on', 'Beacon ein', 'Beacon on'),
      flow('fuelValve', 'open', 'Brandhahn offen', 'Fuel valve open'),
      flow('battery', 'in', 'Hauptschalter (BAT) eingedrückt', 'BAT in'),
      flow('carbHeat', 'off', 'Vergaservorwärmung aus', 'Carb heat off'),
      confirm('Vorflugkontrolle erledigt', 'Pre-flight check done'),
      confirm(
        'Vor dem ersten Start des Tages Propeller von Hand durchgedreht',
        'Before the first start of the day, prop turned by hand',
      ),
      ...setParkingBrake,
      {
        type: 'action',
        control: 'carbHeat',
        position: 'off',
        text: text('Vergaservorwärmung aus', 'Carb heat off'),
      },
      {
        type: 'check',
        target: { control: 'flapBreaker' },
        condition: (state: State) =>
          [
            'comBreaker',
            'xpdrBreaker',
            'gpsBreaker',
            'positionBreaker',
            'strobeBreaker',
            'landingBreaker',
            'intercomBreaker',
            'outletBreaker',
            'flapBreaker',
          ].every((id) => state.controls[id] === 'in'),
        text: text('Sicherungen', 'Breakers'),
        expected: text('alle eingedrückt', 'all in'),
      },
      {
        type: 'action',
        control: 'avionicsMaster',
        position: 'off',
        text: text('Avionik aus', 'Avionics Master off'),
      },
      {
        type: 'action',
        control: 'battery',
        position: 'in',
        text: text('Hauptschalter (BAT) eindrücken', 'BAT in'),
      },
      {
        type: 'action',
        control: 'beacon',
        position: 'on',
        text: text('Beacon ein', 'Beacon on'),
      },
      {
        type: 'action',
        control: 'fuelValve',
        position: 'open',
        text: text('Brandhahn offen', 'Fuel valve open'),
      },
      {
        type: 'action',
        control: 'ignition',
        position: 'off',
        text: text('Zündschlüssel auf OFF gesteckt', 'Key in at OFF'),
      },
      {
        type: 'action',
        control: 'choke',
        position: 'on',
        text: text('Choke nach Bedarf, kalt: gezogen', 'Choke as needed, on when cold'),
      },
      {
        type: 'action',
        control: 'throttle',
        position: 'idle',
        text: text('Gashebel Leerlauf', 'Throttle idle'),
      },
      confirm('Propellerbereich frei', 'Propeller area clear'),
      {
        type: 'action',
        control: 'ignition',
        position: 'both',
        text: text('Zündschalter 1+2', 'Ignition 1+2'),
      },
      {
        type: 'action',
        control: 'ignition',
        position: 'start',
        holdUntil: (state: State) => state.systems.engine.running,
        text: text(
          'Zündschalter auf START, bis das Triebwerk läuft (höchstens 10 s); rollt das Flugzeug, Zündung aus',
          'Key to START until the engine runs (10 s at most); if the aircraft rolls, ignition off',
        ),
      },
      {
        type: 'action',
        control: 'choke',
        position: 'off',
        text: text('Choke nach 20 bis 30 s zurück', 'Choke off after 20 to 30 s'),
      },
      {
        type: 'check',
        target: { indicator: 'oilPressure' },
        condition: (state: State) => state.systems.oilPressureBar >= OIL_PRESSURE_GREEN_BAR[0],
        response: oilPressureReading,
        text: text('Öldruck', 'Oil pressure'),
        expected: text('steigt innerhalb von 10 s über 2 bar', 'rises within 10 s, above 2 bar'),
      },
      {
        type: 'action',
        control: 'generator',
        position: 'in',
        text: text('Generatorschalter (GEN) eindrücken', 'GEN in'),
      },
      {
        type: 'action',
        control: 'avionicsMaster',
        position: 'on',
        text: text('Avionik ein', 'Avionics Master on'),
      },
      // Assumed (unverified), intake §9 question 32, GPS and intercom switch-on steps.
      {
        type: 'action',
        control: 'intercom',
        position: 'on',
        text: text('Intercom ein', 'Intercom on'),
      },
      {
        type: 'action',
        control: 'flapSelector',
        position: '0',
        text: text('Klappen auf Rollstellung 0°', 'Flaps to the taxi setting, 0°'),
      },
      flapCheck(0),
    ],
  },
  taxi: {
    title: text('Rollen zum Rollhalt', 'Taxi out'),
    type: 'normal',
    startPhase: 'taxiOut',
    endPhase: 'holding',
    items: [
      {
        type: 'action',
        control: 'parkingBrakeValve',
        position: 'open',
        text: text(
          'Parkbremshebel auf Off (Ergänzung des Trainers)',
          'Parking-brake lever Off (trainer addition)',
        ),
      },
      {
        type: 'check',
        target: { control: 'parkingBrakeValve' },
        condition: (state: State) => !state.systems.parkingBrakeSet,
        text: text('Parkbremse', 'Parking brake'),
        expected: text('gelöst', 'released'),
      },
      confirm('Bremsen geprüft', 'Brakes checked'),
      confirm('Bugradsteuerung geprüft', 'Nose-wheel steering checked'),
    ],
  },
  beforeTakeoff: {
    title: text('Vor dem Start', 'Before take-off'),
    type: 'normal',
    startPhase: 'holding',
    items: [
      flow('flapSelector', '15', 'Klappen 15°', 'Flaps 15°'),
      flow('trim', 'neutral', 'Trimmrad neutral', 'Trim neutral'),
      flow('choke', 'off', 'Choke zurück', 'Choke off'),
      flow('carbHeat', 'off', 'Vergaservorwärmung aus', 'Carb heat off'),
      ...setParkingBrake,
      confirm('Gurte angelegt', 'Belts fastened'),
      confirm('Türen geschlossen', 'Doors closed'),
      confirm('Steuerung frei', 'Controls free'),
      confirm('Höhenmesser auf QNH', 'Altimeter set to QNH'),
      {
        type: 'action',
        control: 'xpdr.mode',
        position: 'sby',
        text: text('Transponder auf Bereitschaft', 'Transponder to standby'),
      },
      {
        type: 'check',
        target: { control: 'xpdr.mode' },
        condition: (state: State) =>
          state.devices.xpdr?.on === true && state.controls['xpdr.mode'] === 'sby',
        text: text('Transponder', 'Transponder'),
        expected: text('ein, Standby', 'on, standby'),
      },
      // Assumed (unverified), intake §9 question 32, GPS and intercom switch-on steps.
      {
        type: 'action',
        control: 'gps.power',
        position: 'pressed',
        text: text('GPS ein', 'GPS on'),
      },
      {
        type: 'action',
        control: 'choke',
        position: 'off',
        text: text('Choke zurück', 'Choke off'),
      },
      {
        type: 'action',
        control: 'carbHeat',
        position: 'off',
        text: text('Vergaservorwärmung aus', 'Carb heat off'),
      },
      {
        type: 'action',
        control: 'throttle',
        position: 'runup',
        text: text('Gashebel auf 4000 U/min', 'Throttle to 4000 rpm'),
      },
      {
        type: 'check',
        target: { indicator: 'tachometer' },
        condition: (state: State) => Math.abs(state.systems.rpm - RUNUP_RPM) <= RUNUP_RPM_TOLERANCE,
        response: { ...rpmReading, tolerance: RUNUP_RPM_TOLERANCE },
        text: text('Drehzahl', 'Rpm'),
        expected: text(`${RUNUP_RPM} U/min`, `${RUNUP_RPM} rpm`),
      },
      oilPressureGreen,
      {
        type: 'check',
        target: { indicator: 'oilTemperature' },
        condition: (state: State) => state.systems.oilTempC < OIL_TEMP_RED_LINE_C,
        response: oilTempReading,
        text: text('Öltemperatur', 'Oil temperature'),
        expected: text('unter der roten Marke', 'below the red line'),
      },
      chtGreen,
      {
        type: 'action',
        control: 'ignition',
        position: 'left',
        text: text('Zündschalter auf 1', 'Ignition to 1'),
      },
      {
        type: 'check',
        target: { indicator: 'tachometer' },
        condition: circuitDropWithinLimit,
        text: text('Drehzahlabfall', 'Rpm drop'),
        expected: text('höchstens 300 U/min', 'at most 300 rpm'),
      },
      {
        type: 'action',
        control: 'ignition',
        position: 'both',
        text: text('Zündschalter auf 1+2', 'Ignition to 1+2'),
      },
      {
        type: 'action',
        control: 'ignition',
        position: 'right',
        text: text('Zündschalter auf 2', 'Ignition to 2'),
      },
      {
        type: 'check',
        target: { indicator: 'tachometer' },
        condition: circuitDropWithinLimit,
        text: text('Drehzahlabfall', 'Rpm drop'),
        expected: text(
          'höchstens 300 U/min, höchstens 120 U/min Unterschied zu 1',
          'at most 300 rpm, and within 120 rpm of the drop on 1',
        ),
      },
      {
        type: 'action',
        control: 'ignition',
        position: 'both',
        text: text('Zündschalter auf 1+2', 'Ignition to 1+2'),
      },
      {
        type: 'check',
        target: { indicator: 'oilTemperature' },
        condition: (state: State) => state.systems.oilTempC >= MIN_TAKEOFF_OIL_TEMP_C,
        response: oilTempReading,
        text: text('Öltemperatur', 'Oil temperature'),
        expected: text('mindestens 51 °C', 'at least 51 °C'),
      },
      {
        type: 'check',
        target: { indicator: 'chargeLamp' },
        condition: (state: State) => !chargeLampLit(state),
        text: text('Ladekontrolle', 'Charge lamp'),
        expected: text('aus', 'out'),
      },
      {
        type: 'action',
        control: 'throttle',
        position: 'idle',
        text: text('Gashebel Leerlauf', 'Throttle idle'),
      },
      {
        type: 'action',
        control: 'flapSelector',
        position: '15',
        text: text('Klappen 15°', 'Flaps 15°'),
      },
      flapCheck(15),
      {
        type: 'action',
        control: 'trim',
        position: 'neutral',
        text: text('Trimmrad neutral', 'Trim neutral'),
      },
      confirm('Funkgerät eingestellt', 'Radio set'),
      {
        type: 'check',
        target: { control: 'gps.power' },
        condition: (state: State) => field(state, 'gps', 'fix') === true,
        text: text('GPS', 'GPS'),
        expected: text('Position gefunden (3D FIX)', 'position fix (3D FIX)'),
      },
      {
        type: 'guard',
        control: 'rescueHandle',
        position: 'open',
        text: text(
          'Rettungsgerät entsichert, Sicherungsstift gezogen',
          'Rescue system armed, safety pin removed',
        ),
      },
      {
        type: 'action',
        control: 'elt',
        position: 'armed',
        text: text('Notsender auf ARM', 'ELT remote switch at ARM'),
      },
      confirm(
        'Passagier eingewiesen: Gurte, Türverriegelung, Rettungsgerät, Feuerlöscher, Notsender',
        'Passenger briefed: belts, door latch, rescue handle, extinguisher, ELT switch',
      ),
      confirm('Anflug und Abflug frei', 'Approach and departure clear'),
      ...releaseParkingBrake,
    ],
  },
  takeoff: {
    title: text('Normaler Start', 'Normal take-off'),
    type: 'normal',
    startPhase: 'linedUp',
    endPhase: 'departure',
    items: [
      checkRunwayHeading,
      {
        type: 'action',
        control: 'flapSelector',
        position: '15',
        text: text('Klappen 15° (auf Asphalt auch 0°)', 'Flaps 15° (0° possible on pavement)'),
      },
      flapCheck(15),
      {
        type: 'action',
        control: 'carbHeat',
        position: 'off',
        text: text('Vergaservorwärmung aus', 'Carb heat off'),
      },
      {
        type: 'action',
        control: 'throttle',
        position: 'full',
        text: text('Gashebel Vollgas', 'Throttle full'),
      },
      {
        type: 'check',
        target: { indicator: 'tachometer' },
        condition: (state: State) =>
          state.systems.rpm >= MIN_TAKEOFF_RPM && state.systems.rpm <= RED_LINE_RPM,
        response: rpmReading,
        text: text('Drehzahl', 'Rpm'),
        expected: text('4800 bis 5000 U/min, mindestens 4600', '4800 to 5000 rpm, at least 4600'),
      },
      confirm(
        'Bugrad entlasten, Abheben bei etwa 75 km/h',
        'Lift the nose wheel, lift off at about 75 km/h',
      ),
      confirm('Steigen mit 105 km/h und Klappen 15°', 'Climb at 105 km/h with flaps 15°'),
      {
        type: 'action',
        control: 'flapSelector',
        position: '0',
        text: text(
          'Über 50 m (160 ft) bei 105 km/h Klappen auf 0°',
          'Above 50 m (160 ft), at 105 km/h, flaps to 0°',
        ),
      },
      flapCheck(0),
      confirm('Dann 115 km/h', 'Then 115 km/h'),
    ],
  },
  shortTakeoff: {
    title: text('Kurzstart', 'Short take-off'),
    type: 'normal',
    startPhase: 'linedUp',
    endPhase: 'departure',
    items: [
      checkRunwayHeading,
      {
        type: 'action',
        control: 'flapSelector',
        position: '15',
        text: text('Klappen 15°', 'Flaps 15°'),
      },
      flapCheck(15),
      ...setParkingBrake,
      {
        type: 'action',
        control: 'choke',
        position: 'off',
        text: text('Choke zurück', 'Choke off'),
      },
      {
        type: 'action',
        control: 'carbHeat',
        position: 'off',
        text: text('Vergaservorwärmung aus', 'Carb heat off'),
      },
      {
        type: 'action',
        control: 'throttle',
        position: 'full',
        text: text('Gashebel Vollgas', 'Throttle full'),
      },
      ...releaseParkingBrake,
      confirm('Rotieren bei 65 km/h', 'Rotate at 65 km/h'),
      confirm('Auf 105 km/h beschleunigen', 'Accelerate to 105 km/h'),
      confirm('Steilster Steigflug mit 105 km/h', 'Steepest climb at 105 km/h'),
    ],
  },
  climbCruise: {
    title: text('Steigflug und Reiseflug', 'Climb and cruise'),
    type: 'normal',
    startPhase: 'departure',
    endPhase: 'cruise',
    items: [
      confirm(
        'Sichere Höhe erreicht, Klappen nie negativ in Bodennähe',
        'Safe height reached, never negative flaps near the ground',
      ),
      {
        type: 'action',
        control: 'flapSelector',
        position: '-12',
        text: text('Klappen −12°', 'Flaps −12°'),
      },
      flapCheck(-12),
      confirm(
        'Steiggeschwindigkeit nach Klappenstellung: bestes Steigen mit −12° bei 125 km/h',
        'Climb speed by flap setting: best rate with −12° at 125 km/h',
      ),
      {
        type: 'check',
        target: { indicator: 'tachometer' },
        condition: (state: State) => state.systems.rpm <= MAX_CONTINUOUS_RPM,
        response: rpmReading,
        text: text('Drehzahl', 'Rpm'),
        expected: text('höchstens 5500 U/min', 'at most 5500 rpm'),
      },
      {
        type: 'action',
        control: 'throttle',
        position: 'cruise',
        text: text(
          'Reiseleistung nach Bedarf: etwa 4800 U/min sparsam, 4300 für Reichweite, höchstens 5500',
          'Cruise power as needed: about 4800 rpm economical, 4300 for range, 5500 at most',
        ),
      },
      oilPressureGreen,
      {
        type: 'check',
        target: { indicator: 'oilTemperature' },
        condition: (state: State) => within(state.systems.oilTempC, OIL_TEMP_GREEN_C),
        response: oilTempReading,
        text: text('Öltemperatur', 'Oil temperature'),
        expected: text('im grünen Bereich', 'in the green'),
      },
      chtGreen,
      confirm('Vergaservorwärmung nur bei Vereisungsgefahr', 'Carb heat only when icing is likely'),
    ],
  },
  descent: {
    title: text('Sinkflug', 'Descent'),
    type: 'normal',
    startPhase: 'cruise',
    endPhase: 'approach',
    items: [
      confirm('Vergaservorwärmung nach Bedarf', 'Carb heat as needed'),
      confirm('Höhenmesser eingestellt', 'Altimeter set'),
    ],
  },
  beforeLanding: {
    title: text('Vor der Landung', 'Before landing'),
    type: 'normal',
    startPhase: 'approach',
    items: [
      confirm('Gurte fest', 'Belts tight'),
      confirm('Geschwindigkeit 110 km/h', 'Speed 110 km/h'),
      {
        type: 'action',
        control: 'flapSelector',
        position: '30',
        text: text('Klappen 15° bis 35°, hier 30°', 'Flaps 15° to 35°, here 30°'),
      },
      flapCheck(30),
      confirm('Landelicht nach Bedarf', 'Landing light as needed'),
    ],
  },
  landing: {
    title: text('Normale Landung', 'Normal landing'),
    type: 'normal',
    startPhase: 'approach',
    endPhase: 'landing',
    items: [
      {
        type: 'action',
        control: 'throttle',
        position: 'low',
        text: text(
          'Anflug mit 100 km/h und 10 bis 20 % Leistung',
          'Approach at 100 km/h with 10 to 20 % power',
        ),
      },
      {
        type: 'action',
        control: 'flapSelector',
        position: '30',
        text: text(
          'Klappen im Endanflug 15° oder 30°, hier 30° (Seitenwind: 15° oder 0°)',
          'Flaps on final 15° or 30°, here 30° (crosswind: 15° or 0°)',
        ),
      },
      flapCheck(30),
      confirm('Endanflug mit 100 km/h', 'Final at 100 km/h'),
      {
        type: 'action',
        control: 'carbHeat',
        position: 'off',
        text: text('Vergaservorwärmung im kurzen Endanflug aus', 'Carb heat off on short final'),
      },
      {
        type: 'action',
        control: 'throttle',
        position: 'idle',
        text: text('In etwa 1 m Höhe Leerlauf', 'At about 1 m, throttle idle'),
      },
      confirm('Sanft abfangen, Bug nicht zu hoch', 'Flare gently, nose not too high'),
      confirm(
        'Nach dem Aufsetzen Knüppel sanft ziehen, Bugrad entlasten',
        'After touchdown, stick gently back to unload the nose wheel',
      ),
    ],
  },
  goAround: {
    title: text('Durchstarten', 'Go-around'),
    type: 'normal',
    startPhase: 'landing',
    endPhase: 'departure',
    items: [
      {
        type: 'action',
        control: 'throttle',
        position: 'full',
        text: text('Vollgas', 'Full power'),
      },
      {
        type: 'action',
        control: 'carbHeat',
        position: 'off',
        text: text('Vergaservorwärmung aus', 'Carb heat off'),
      },
      {
        type: 'action',
        control: 'flapSelector',
        position: '15',
        text: text('Klappen 15°', 'Flaps 15°'),
      },
      flapCheck(15),
      confirm('Geschwindigkeit 110 km/h', 'Speed 110 km/h'),
      confirm('Positives Steigen', 'Positive climb'),
    ],
  },
  afterLanding: {
    title: text('Nach der Landung', 'After landing'),
    type: 'normal',
    startPhase: 'taxiIn',
    items: [
      flow('landingLight', 'off', 'Landelicht aus', 'Landing light off'),
      flow('flapSelector', '0', 'Klappen eingefahren (0°)', 'Flaps retracted (0°)'),
      flow('carbHeat', 'off', 'Vergaservorwärmung aus', 'Carb heat off'),
      {
        type: 'action',
        control: 'throttle',
        position: 'idle',
        text: text('Gashebel Leerlauf', 'Throttle idle'),
      },
      confirm('Bremsen nach Bedarf', 'Brakes as needed'),
      {
        type: 'action',
        control: 'carbHeat',
        position: 'off',
        text: text('Vergaservorwärmung aus', 'Carb heat off'),
      },
      {
        type: 'action',
        control: 'landingLight',
        position: 'off',
        text: text('Landelicht aus', 'Landing light off'),
      },
      {
        type: 'action',
        control: 'flapSelector',
        position: '0',
        text: text('Klappen eingefahren (0°)', 'Flaps retracted (0°)'),
      },
      flapCheck(0),
      confirm(
        'Auf 121,5 MHz hören, ob der Notsender versehentlich sendet',
        'Listen on 121.5 MHz for an accidental ELT activation',
      ),
    ],
  },
  shutdown: {
    title: text('Abstellen und Sichern', 'Shutdown and securing'),
    type: 'normal',
    startPhase: 'parkingSecuring',
    items: [
      ...setParkingBrake,
      {
        type: 'action',
        control: 'avionicsMaster',
        position: 'off',
        text: text('Avionik aus', 'Avionics Master off'),
      },
      {
        type: 'action',
        control: 'beacon',
        position: 'off',
        text: text('Beacon aus', 'Beacon off'),
      },
      {
        type: 'action',
        control: 'positionLights',
        position: 'off',
        text: text('Positionslichter aus', 'Position lights off'),
      },
      {
        type: 'action',
        control: 'intercom',
        position: 'off',
        text: text('Intercom aus', 'Intercom off'),
      },
      {
        type: 'action',
        control: 'cockpitLight',
        position: 'off',
        text: text('Cockpitlicht aus', 'Cockpit light off'),
      },
      {
        type: 'action',
        control: 'landingLight',
        position: 'off',
        text: text('Landelicht aus', 'Landing light off'),
      },
      {
        type: 'action',
        control: 'generator',
        position: 'pulled',
        text: text('Generatorschalter (GEN) ziehen', 'GEN out'),
      },
      {
        type: 'action',
        control: 'ignition',
        position: 'off',
        text: text('Zündschalter OFF', 'Ignition OFF'),
      },
      {
        type: 'action',
        control: 'battery',
        position: 'pulled',
        text: text('Hauptschalter (BAT) ziehen', 'BAT out'),
      },
      {
        type: 'action',
        control: 'fuelValve',
        position: 'closed',
        text: text('Brandhahn zu', 'Fuel valve closed'),
      },
      {
        type: 'action',
        control: 'ignition',
        position: 'out',
        text: text('Zündschlüssel abgezogen', 'Key out'),
      },
      {
        type: 'guard',
        control: 'rescueHandle',
        position: 'closed',
        text: text(
          'Rettungsgerät gesichert, Sicherungsstift gesteckt',
          'Rescue system secured, safety pin in',
        ),
      },
      {
        type: 'action',
        control: 'elt',
        position: 'armed',
        text: text('Notsender geprüft, bleibt auf ARM', 'ELT checked and left at ARM'),
      },
      confirm('Bremsklötze vorgelegt', 'Chocks in place'),
    ],
  },
} as const satisfies CtslProcedures;

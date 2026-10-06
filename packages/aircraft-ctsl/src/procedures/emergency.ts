import { chargeLampLit } from '../indicators';
import type { CtslTrainerState } from '../systems';
import { text } from '../text';
import type { CtslProcedures } from '../types';

type Item = CtslProcedures[string]['items'][number];

// Values from docs/aircraft/ctsl-intake.md §4.2, §4.3 and §8.
const IDLE_RPM = 1400;
const CHT_RED_LINE_C = 120;
const OIL_PRESSURE_MIN_BAR = 0.8;
const FULL_NEGATIVE_FLAPS_DEG = -12;

const engineStopped = (state: CtslTrainerState) => state.systems.rpm < IDLE_RPM;

const flapsStoppedPastFullNegative = (state: CtslTrainerState) =>
  !state.systems.flaps.moving && state.systems.flaps.angle < FULL_NEGATIVE_FLAPS_DEG;

const engineStoppedCheck: Item = {
  type: 'check',
  target: { indicator: 'tachometer' },
  condition: engineStopped,
  text: text('Drehzahl unter Leerlauf: Triebwerk steht', 'Rpm below idle: the engine has stopped'),
};

const confirm = (de: string, en: string): Item => ({ type: 'confirm', text: text(de, en) });

const fieldChosen = confirm(
  'Landefeld in Gleitreichweite gewählt; keines erreichbar: Rettungsgerät',
  'Field within gliding reach chosen; none reachable: rescue system',
);

const preparation: readonly Item[] = [
  confirm('Gurte fest angezogen', 'Belts tight'),
  confirm('Lose Gegenstände verstaut', 'Loose items stowed'),
  confirm('Notruf abgesetzt', 'Emergency call made'),
];

const glide: readonly Item[] = [
  {
    type: 'action',
    control: 'flapSelector',
    position: '0',
    text: text(
      'Klappenwahlschalter 0°, bestes Gleiten 125 km/h; mehr Klappen erst, wenn das Feld sicher erreicht ist',
      'Flap selector 0°, best glide 125 km/h; more flap only once the field is made',
    ),
  },
  confirm(
    'Anflug mit 100 km/h, in Getreide oder Wald 90 km/h',
    'Approach at 100 km/h, 90 km/h into crops or forest',
  ),
  confirm('Zu hoch: S-Kurven fliegen', 'Too high: fly S-turns'),
];

const flare = confirm(
  'Abfangen etwa 50 cm über Boden oder Baumkronen',
  'Flare about 50 cm above the ground or the treetops',
);

const shutDownInFlare: readonly Item[] = [
  {
    type: 'action',
    control: 'ignition',
    position: 'off',
    text: text('Im Abfangen: Zündschalter OFF', 'In the flare: ignition OFF'),
  },
  {
    type: 'action',
    control: 'fuelValve',
    position: 'closed',
    text: text('Brandhahn zu', 'Fuel valve (Brandhahn) closed'),
  },
];

const afterTouchdown: readonly Item[] = [
  {
    type: 'action',
    control: 'brake',
    position: 'on',
    text: text(
      'Nach dem Aufsetzen: Knüppel ganz zurück, Bremshebel ziehen',
      'After touchdown: stick fully back, brake lever on',
    ),
  },
  {
    type: 'action',
    control: 'elt',
    position: 'on',
    text: text(
      'Notsender ON, falls er nicht ausgelöst hat',
      'ELT remote switch (Notsender) ON if it has not triggered',
    ),
  },
  {
    type: 'check',
    target: { indicator: 'eltLamp' },
    condition: (state) => state.systems.eltTransmitting,
    text: text('Notsenderlampe leuchtet', 'ELT lamp is lit'),
  },
];

export const emergencyProcedures = {
  engineFailureLow: {
    title: text('Triebwerksausfall unter 100 m', 'Engine failure below 100 m (330 ft)'),
    type: 'emergency',
    failure: 'engineStoppage',
    startPhase: 'departure',
    items: [
      engineStoppedCheck,
      confirm(
        'Kein Neustart; geradeaus landen, keine Umkehrkurve unter 250 m, unter 50 m gar keine Kurven',
        'No restart; land ahead, no turn back below 250 m (820 ft), no turns at all below 50 m (160 ft)',
      ),
      fieldChosen,
      ...preparation,
      confirm(
        'Anflug mit 100 km/h, in Getreide oder Wald 90 km/h',
        'Approach at 100 km/h, 90 km/h into crops or forest',
      ),
      flare,
      ...shutDownInFlare,
      ...afterTouchdown,
    ],
  },
  engineFailureRestart: {
    title: text(
      'Triebwerksausfall über 100 m: Neustart',
      'Engine failure above 100 m (330 ft): restart',
    ),
    type: 'emergency',
    failure: 'engineStoppage',
    startPhase: 'cruise',
    items: [
      engineStoppedCheck,
      {
        type: 'action',
        control: 'fuelValve',
        position: 'open',
        text: text('Brandhahn offen', 'Fuel valve (Brandhahn) open'),
      },
      confirm(
        'Kraftstoff in beiden Tanks sichtbar; ist einer leer, diese Fläche hoch halten',
        'Fuel visible in both tanks; if one shows empty, keep that wing up',
      ),
      {
        type: 'action',
        control: 'ignition',
        position: 'both',
        text: text('Zündschalter BOTH', 'Ignition BOTH'),
      },
      {
        type: 'action',
        control: 'ignition',
        position: 'start',
        text: text(
          'Propeller unter etwa 200 U/min: Zündschalter auf START',
          'Propeller below about 200 rpm: ignition to START',
        ),
      },
      {
        ...engineStoppedCheck,
        text: text('Triebwerk springt nicht an', 'The engine does not restart'),
      },
      confirm('Notlandung einleiten', 'Go to the emergency landing'),
      fieldChosen,
      ...preparation,
      ...glide,
      flare,
      ...shutDownInFlare,
      ...afterTouchdown,
    ],
  },
  rescueDeployment: {
    title: text(
      'Rettungsgerät: Triebwerksausfall ohne erreichbares Landefeld',
      'Rescue system: engine failure with no field within reach',
    ),
    type: 'emergency',
    failure: 'engineStoppage',
    startPhase: 'cruise',
    items: [
      engineStoppedCheck,
      confirm(
        'Kein Landefeld in Gleitreichweite: Rettungsgerät auslösen',
        'No field within gliding reach: deploy the rescue system',
      ),
      {
        type: 'action',
        control: 'ignition',
        position: 'off',
        text: text(
          'Zündschalter OFF, damit der Propeller den Schirm nicht beschädigt',
          'Ignition OFF so the propeller cannot damage the parachute',
        ),
      },
      {
        type: 'action',
        control: 'rescueHandle',
        position: 'pulled',
        text: text(
          'Rettungsgerät: Griff kräftig und weit ziehen, bis die Rakete zündet (höchstens VNE)',
          'Rescue system: pull the handle hard and far until the rocket fires (at most VNE)',
        ),
      },
      {
        type: 'check',
        target: { control: 'rescueHandle' },
        condition: (state) => state.systems.rescueDeployed,
        text: text('Rakete gezündet, Schirm draußen', 'Rocket fired, parachute out'),
      },
      {
        type: 'action',
        control: 'fuelValve',
        position: 'closed',
        text: text('Brandhahn zu', 'Fuel valve (Brandhahn) closed'),
      },
      confirm('Notruf abgesetzt', 'Emergency call made'),
      {
        type: 'action',
        control: 'battery',
        position: 'pulled',
        text: text('Hauptschalter (BAT) gezogen', 'Master switch (BAT) pulled'),
      },
      confirm('Gurte fest angezogen', 'Belts tight'),
      confirm(
        'Schutzhaltung: Hände im Nacken verschränkt, Unterarme neben dem Gesicht',
        'Brace: hands crossed behind the neck, forearms beside the face',
      ),
    ],
  },
  engineFire: {
    title: text('Triebwerksbrand', 'Engine fire'),
    type: 'emergency',
    failure: 'engineFire',
    startPhase: 'cruise',
    items: [
      {
        type: 'check',
        target: { control: 'fuelValve' },
        condition: (state) => state.systems.fire,
        text: text('Rauch oder Flammen am Triebwerk', 'Smoke or flames from the engine'),
      },
      {
        type: 'action',
        control: 'fuelValve',
        position: 'closed',
        text: text('Brandhahn sofort zu', 'Fuel valve (Brandhahn) closed at once'),
      },
      {
        type: 'action',
        control: 'throttle',
        position: 'full',
        holdUntil: (state) => !state.systems.engine.running,
        text: text('Vollgas, bis das Triebwerk steht', 'Throttle full until the engine stops'),
      },
      {
        type: 'action',
        control: 'ignition',
        position: 'off',
        text: text('Zündschalter OFF', 'Ignition OFF'),
      },
      confirm(
        'Schlüssel abgezogen: geht nur bei ganz geschlossenem Brandhahn',
        'Key out: only possible with the fuel valve fully closed',
      ),
      confirm(
        'Im Sinkflug von den Flammen wegschieben',
        'Slip away from the flames while descending',
      ),
      confirm(
        'Rettungsgerät bei Feuer an Bord nie auslösen: Notlandung',
        'Never deploy the rescue system with fire on board: emergency landing',
      ),
      confirm('Landefeld in Gleitreichweite gewählt', 'Field within gliding reach chosen'),
      ...preparation,
      ...glide,
      flare,
      ...afterTouchdown,
    ],
  },
  coolantLoss: {
    title: text('Kühlmittelverlust', 'Coolant loss'),
    type: 'emergency',
    failure: 'coolantLoss',
    startPhase: 'cruise',
    items: [
      {
        type: 'check',
        target: { indicator: 'cht' },
        condition: (state) => state.systems.chtC >= CHT_RED_LINE_C,
        text: text('Zylinderkopftemperatur erreicht die rote Linie', 'CHT reaches the red line'),
      },
      {
        type: 'action',
        control: 'throttle',
        position: 'low',
        text: text('Leistung reduzieren', 'Reduce power'),
      },
      {
        type: 'check',
        target: { indicator: 'cht' },
        condition: (state) => state.systems.chtC < CHT_RED_LINE_C,
        text: text(
          'Zylinderkopftemperatur unter der roten Linie halten',
          'Keep the CHT below the red line',
        ),
      },
      confirm(
        'Wird die Fahrt zu gering: Klappen 0° bis 15°',
        'If the speed gets low: flaps 0° to 15°',
      ),
      confirm('Am nächsten Flugplatz landen', 'Land at the nearest airfield'),
    ],
  },
  oilLoss: {
    title: text('Ölverlust', 'Oil loss'),
    type: 'emergency',
    failure: 'oilLoss',
    startPhase: 'cruise',
    items: [
      {
        type: 'check',
        target: { indicator: 'oilPressure' },
        condition: (state) => state.systems.oilPressureBar < OIL_PRESSURE_MIN_BAR,
        text: text('Öldruck unter dem Minimum', 'Oil pressure below the minimum'),
      },
      {
        type: 'action',
        control: 'ignition',
        position: 'off',
        text: text('Zündschalter OFF', 'Ignition OFF'),
      },
      confirm('Schlüssel abgezogen', 'Key out'),
      {
        type: 'action',
        control: 'fuelValve',
        position: 'closed',
        text: text('Brandhahn zu', 'Fuel valve (Brandhahn) closed'),
      },
      confirm('Sofort notlanden: Brandgefahr', 'Emergency landing at once: fire risk'),
      fieldChosen,
      ...preparation,
      ...glide,
      flare,
      ...afterTouchdown,
    ],
  },
  flapControlFailure: {
    title: text('Ausfall der Klappensteuerung', 'Flap control failure'),
    type: 'emergency',
    failure: 'flapControlFailure',
    startPhase: 'cruise',
    items: [
      confirm('Klappen folgen dem Wahlschalter nicht', 'The flaps do not follow the selector'),
      {
        type: 'action',
        control: 'generator',
        position: 'pulled',
        text: text('Generatorschalter (GEN) gezogen', 'Generator switch (GEN) pulled'),
      },
      {
        type: 'action',
        control: 'battery',
        position: 'pulled',
        text: text('Hauptschalter (BAT) gezogen', 'Master switch (BAT) pulled'),
      },
      confirm('3 Sekunden warten', 'Wait 3 seconds'),
      {
        type: 'action',
        control: 'battery',
        position: 'in',
        text: text('Hauptschalter (BAT) eingedrückt', 'Master switch (BAT) in'),
      },
      {
        type: 'action',
        control: 'generator',
        position: 'in',
        text: text(
          'Generatorschalter (GEN) eingedrückt; die Zündung braucht den Bus nicht',
          'Generator switch (GEN) in; the ignition does not need the bus',
        ),
      },
      {
        type: 'action',
        control: 'flapBreaker',
        position: 'in',
        text: text(
          'Klappensicherung eingedrückt; sie kann nach Überlastung ausgelöst haben',
          'Flap breaker in; it may have tripped after an overload',
        ),
      },
      confirm(
        'Klappen weiter ohne Reaktion: Notbetätigung',
        'Flaps still not responding: use the override',
      ),
      {
        type: 'action',
        control: 'flapSelector',
        position: 'override-up',
        holdUntil: flapsStoppedPastFullNegative,
        text: text(
          'Klappenwahlschalter über −12° hinaus (UP), bis die Klappen voll negativ stehen',
          'Flap selector past −12° (UP) until the flaps reach full negative',
        ),
      },
      {
        type: 'action',
        control: 'flapSelector',
        position: '-12',
        text: text('Klappenwahlschalter zurück auf −12°', 'Flap selector back to −12°'),
      },
      {
        type: 'check',
        target: { indicator: 'flapReadout' },
        condition: flapsStoppedPastFullNegative,
        text: text('Klappen stehen voll negativ', 'Flaps stay at full negative'),
      },
      confirm(
        'Lange Bahn: mit negativen Klappen landen, Anflug 120 km/h bei −12° oder 110 km/h bei 0°',
        'Long runway: land with negative flaps, approach 120 km/h at −12° or 110 km/h at 0°',
      ),
      confirm(
        'Kurze Bahn: im kurzen Endanflug über 35° hinaus (DOWN) voll ausfahren, zum Anhalten zurück auf 35°',
        'Short runway: on short final drive past 35° (DOWN) to full positive, back to 35° to stop',
      ),
    ],
  },
  generatorFailure: {
    title: text(
      'Generatorausfall (Vereinsverfahren, nicht aus dem Handbuch)',
      'Generator failure (club-authored, not from the handbook)',
    ),
    type: 'emergency',
    failure: 'generatorFailure',
    startPhase: 'cruise',
    items: [
      {
        type: 'check',
        target: { indicator: 'chargeLamp' },
        condition: chargeLampLit,
        text: text('Ladekontrolle leuchtet', 'Charge warning lamp is lit'),
      },
      {
        type: 'action',
        control: 'generator',
        position: 'pulled',
        text: text('Generatorschalter (GEN) gezogen', 'Generator switch (GEN) pulled'),
      },
      {
        type: 'action',
        control: 'generator',
        position: 'in',
        text: text(
          'Generatorschalter (GEN) einmal wieder eindrücken',
          'Generator switch (GEN) in again, once',
        ),
      },
      {
        type: 'check',
        target: { indicator: 'chargeLamp' },
        condition: chargeLampLit,
        text: text(
          'Lampe leuchtet weiter: nur noch die Batterie versorgt den Bus',
          'Lamp stays lit: the battery is the only source',
        ),
      },
      {
        type: 'action',
        control: 'landingLight',
        position: 'off',
        text: text('Landescheinwerfer AUS', 'Landing light OFF'),
      },
      confirm(
        'Nicht benötigte Verbraucher und Avionik aus',
        'Consumers and avionics not needed: off',
      ),
      confirm('Baldmöglichst landen', 'Land as soon as practical'),
    ],
  },
} as const satisfies CtslProcedures;

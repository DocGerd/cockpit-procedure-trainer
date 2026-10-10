import type { ArtworkAppearance, ControlRecord, Text } from '@cpt/core';
import { controlArtwork } from './artwork';
import { text } from './text';

const breakerOf = (name: Text, description: Text, appearance: ArtworkAppearance) =>
  ({
    kind: 'breaker',
    positions: ['in', 'pulled'],
    initial: 'in',
    name,
    description,
    appearance,
  }) as const;

const rockerOf = (name: Text, description: Text, appearance: ArtworkAppearance) =>
  ({
    kind: 'toggle',
    positions: ['off', 'on'],
    initial: 'off',
    // The rocker prints the I and O symbols, so the cues name the position in words.
    legends: {
      off: {
        state: text('aus', 'off'),
        restore: text('Wieder ausschalten', 'Switch it off again'),
      },
      on: {
        state: text('ein', 'on'),
        restore: text('Wieder einschalten', 'Switch it on again'),
      },
    },
    name,
    description,
    appearance,
  }) as const;

const pushPullOf = (name: Text, description: Text, appearance: ArtworkAppearance) =>
  ({
    kind: 'lever',
    positions: ['off', 'on'],
    initial: 'off',
    name,
    description,
    appearance,
  }) as const;

export const controls = {
  comBreaker: breakerOf(
    text('Sicherung COM', 'COM breaker'),
    text('Schützt das Funkgerät am Avionikbus.', 'Protects the COM radio on the avionics bus.'),
    controlArtwork.comBreaker,
  ),
  xpdrBreaker: breakerOf(
    text('Sicherung Transponder', 'Transponder breaker'),
    text('Schützt den Transponder am Avionikbus.', 'Protects the transponder on the avionics bus.'),
    controlArtwork.xpdrBreaker,
  ),
  gpsBreaker: breakerOf(
    text('Sicherung GPS', 'GPS breaker'),
    text(
      'Schützt die GPS-Halterung am Avionikbus.',
      'Protects the GPS cradle on the avionics bus.',
    ),
    controlArtwork.gpsBreaker,
  ),
  positionBreaker: breakerOf(
    text('Sicherung Positionslichter', 'Position lights breaker'),
    text('Schützt die Positionslichter.', 'Protects the position lights.'),
    controlArtwork.positionBreaker,
  ),
  strobeBreaker: breakerOf(
    text('Sicherung Blitzlicht', 'Strobe breaker'),
    text('Schützt das Blitzlicht (Beacon).', 'Protects the beacon strobe.'),
    controlArtwork.strobeBreaker,
  ),
  landingBreaker: breakerOf(
    text('Sicherung Landescheinwerfer', 'Landing light breaker'),
    text('Schützt den Landescheinwerfer.', 'Protects the landing light.'),
    controlArtwork.landingBreaker,
  ),
  intercomBreaker: breakerOf(
    text('Sicherung Bordsprechanlage', 'Intercom breaker'),
    text('Schützt die Bordsprechanlage.', 'Protects the intercom.'),
    controlArtwork.intercomBreaker,
  ),
  outletBreaker: breakerOf(
    text('Sicherung 12-V-Steckdose', '12 V outlet breaker'),
    text('Schützt die 12-V-Steckdose.', 'Protects the 12 V outlet.'),
    controlArtwork.outletBreaker,
  ),
  avionicsMaster: rockerOf(
    text('Avionik', 'Avionics Master'),
    text(
      'Schaltet den Avionikbus mit Funkgerät, Transponder und GPS. Beim Anlassen und Abstellen aus.',
      'Switches the avionics bus with the radio, transponder and GPS. Off for engine start and stop.',
    ),
    controlArtwork.avionicsMaster,
  ),
  beacon: rockerOf(
    text('Blitzlicht', 'Beacon light'),
    text('Schaltet das Blitzlicht (Beacon).', 'Switches the beacon strobe.'),
    controlArtwork.beacon,
  ),
  positionLights: rockerOf(
    text('Positionslichter', 'Position lights'),
    text('Schaltet die Positionslichter.', 'Switches the position lights.'),
    controlArtwork.positionLights,
  ),
  intercom: rockerOf(
    text('Bordsprechanlage', 'Intercom'),
    text('Schaltet die Bordsprechanlage.', 'Switches the intercom.'),
    controlArtwork.intercom,
  ),
  cockpitLight: rockerOf(
    text('Cockpitbeleuchtung', 'Cockpit light'),
    text('Schaltet die Cockpitbeleuchtung.', 'Switches the cockpit light.'),
    controlArtwork.cockpitLight,
  ),
  landingLight: rockerOf(
    text('Landescheinwerfer', 'Landing light'),
    text('Schaltet den Landescheinwerfer.', 'Switches the landing light.'),
    controlArtwork.landingLight,
  ),
  elt: {
    kind: 'toggle',
    positions: ['armed', 'on'],
    initial: 'armed',
    legends: { armed: 'ARM' },
    name: text('Notsender', 'ELT remote switch'),
    description: text(
      'Fernschalter des Notsenders, oben ON, unten ARM. ARM löst bei einem Aufprall aus, ON sendet sofort; die Lampe zeigt das Senden.',
      'Remote switch of the emergency locator transmitter, ON up, ARM down. ARM triggers it on impact, ON transmits at once; the lamp shows it transmitting.',
    ),
    appearance: controlArtwork.elt,
  },
  flapBreaker: breakerOf(
    text('Klappensicherung', 'Flap breaker'),
    text(
      'Thermische Sicherung des Klappenantriebs. Sie kann nach einer Überlastung auslösen.',
      'Thermal breaker of the flap drive. It can trip after an overload.',
    ),
    controlArtwork.flapBreaker,
  ),
  fuelValve: {
    kind: 'toggle',
    positions: ['open', 'closed'],
    initial: 'closed',
    legends: { open: 'Open', closed: 'Closed' },
    name: text('Brandhahn', 'Fuel valve'),
    description: text(
      'Schieber für die Kraftstoffzufuhr, oben offen, unten zu. Geschlossen verdeckt sein Griff das Zündschloss: der Schlüssel lässt sich weder stecken noch aus OFF drehen, nur abziehen. Abziehen geht nur bei ganz geschlossenem Brandhahn.',
      'Slide lever for the fuel supply, up open, down closed. Closed, its handle covers the ignition key slot, so the key can neither go in nor turn out of OFF, only come out. The key comes out only with the valve fully closed.',
    ),
    appearance: controlArtwork.fuelValve,
  },
  flapSelector: {
    kind: 'rotary',
    positions: ['override-up', '-12', '0', '15', '30', '35', 'override-down'],
    initial: '0',
    legends: { 'override-up': 'up manually', 'override-down': 'down manually' },
    name: text('Klappenwahlschalter', 'Flap selector'),
    description: text(
      'Wählt die Klappenstellung in Grad vor. Hinter den Endrasten liegt je eine Notbetätigung: der Motor läuft, solange der Schalter dort steht.',
      'Preselects the flap setting in degrees. Past each end detent is a manual override: the motor runs while the knob stays there.',
    ),
    appearance: controlArtwork.flapSelector,
  },
  ignition: {
    kind: 'rotary',
    positions: ['out', 'off', 'left', 'right', 'both', 'start'],
    initial: 'out',
    springBack: { start: 'both' },
    onlyFrom: { out: ['off'] },
    legends: {
      out: {
        state: text('Schlüssel abgezogen', 'key out'),
        restore: text('Schlüssel wieder abziehen', 'Take the key out again'),
      },
      left: '1',
      right: '2',
      both: '1+2',
    },
    interlock: [
      { control: 'fuelValve', at: 'closed', holds: ['out'] },
      { control: 'fuelValve', at: 'closed', holds: ['off', 'out'] },
      { control: 'fuelValve', at: 'open', holds: ['off', 'left', 'right', 'both', 'start'] },
    ],
    name: text('Zündschalter', 'Ignition'),
    description: text(
      'Zündschloss mit Anlasser: OFF, 1, 2, 1+2, START. Der Schlüssel wird auf OFF gesteckt und abgezogen. START dreht das Triebwerk und springt auf 1+2 zurück. Gesteckt wird er bei offenem Brandhahn, abgezogen nur bei geschlossenem: dann verdeckt dessen Griff das Schloss, und der Schlüssel lässt sich nicht stecken und nicht aus OFF drehen.',
      'Ignition key with starter: OFF, 1, 2, 1+2, START. The key goes in and comes out at OFF. START cranks the engine and springs back to 1+2. The key goes in with the fuel valve open and comes out only with it closed; closed, its handle covers the slot, so the key can neither go in nor turn out of OFF.',
    ),
    appearance: controlArtwork.ignition,
  },
  battery: {
    ...breakerOf(
      text('Hauptschalter (BAT)', 'Master switch (BAT)'),
      text(
        'Zieh-Druck-Schalter der Batterie. Eingedrückt ist die Batterie auf dem Hauptbus.',
        'Push-pull switch of the battery. Pushed in, the battery feeds the main bus.',
      ),
      controlArtwork.battery,
    ),
    initial: 'pulled',
  },
  generator: {
    ...breakerOf(
      text('Generatorschalter (GEN)', 'Generator switch (GEN)'),
      text(
        'Zieh-Druck-Schalter des Generators. Eingedrückt lädt der Generator bei laufendem Triebwerk.',
        'Push-pull switch of the generator. Pushed in, the generator charges while the engine runs.',
      ),
      controlArtwork.generator,
    ),
    initial: 'pulled',
  },
  brake: {
    kind: 'momentary',
    positions: ['off', 'on'],
    initial: 'off',
    name: text('Bremshebel', 'Brake lever'),
    description: text(
      'Hydraulische Bremse beider Haupträder. Bremst nur, solange er gezogen gehalten wird; federt beim Loslassen zurück. Steht der Rückflusshahn auf On, hält der Druck als Parkbremse.',
      'Hydraulic brake on both main wheels. Brakes only while held; springs back when released. With the parking-brake valve at On the pressure holds as the parking brake.',
    ),
    appearance: controlArtwork.brake,
  },
  throttle: {
    kind: 'lever',
    positions: ['idle', 'low', 'runup', 'cruise', 'full'],
    initial: 'idle',
    // The placard prints only FULL and IDLE; the middle stops are the trainer's own.
    legends: {
      low: {
        state: text('niedrige Leistung', 'low power'),
        restore: text('Wieder auf niedrige Leistung stellen', 'Set low power again'),
      },
      runup: {
        state: text('Standprobenleistung', 'run-up power'),
        restore: text('Wieder auf Standprobenleistung stellen', 'Set run-up power again'),
      },
      cruise: {
        state: text('Reiseleistung', 'cruise power'),
        restore: text('Wieder auf Reiseleistung stellen', 'Set cruise power again'),
      },
    },
    name: text('Gashebel', 'Throttle'),
    description: text(
      'Stellt die Leistung ein: Leerlauf, niedrige Leistung, Standprobe, Reiseflug und Vollgas.',
      'Sets engine power: idle, low power, run-up, cruise and full.',
    ),
    appearance: controlArtwork.throttle,
  },
  choke: pushPullOf(
    text('Choke', 'Choke'),
    text(
      'Kaltstarthilfe. Für einen Kaltstart ganz ziehen, mit dem Gashebel auf Leerlauf.',
      'Cold-start aid. Pull fully for a cold start, with the throttle at idle.',
    ),
    controlArtwork.choke,
  ),
  carbHeat: pushPullOf(
    text('Vergaservorwärmung', 'Carb heat'),
    text(
      'Vorläufiges Bedienelement: das Handbuch nennt die Vergaservorwärmung in den Checklisten, zeigt aber keinen Zug. Ort und Ausführung muss der Verein bestätigen.',
      'Provisional control: the handbook names carb heat in its checklists but shows no knob. Its place and form await the club.',
    ),
    controlArtwork.carbHeat,
  ),
  trim: {
    kind: 'lever',
    positions: ['nose-down', 'half-down', 'neutral', 'half-up', 'nose-up'],
    initial: 'neutral',
    // The placard prints DOWN and UP only; neutral is what the take-off placard asks for and the
    // stops between are the trainer's own.
    legends: {
      'nose-down': 'DOWN',
      'nose-up': 'UP',
      'half-down': {
        state: text('halb kopflastig', 'half nose down'),
        restore: text('Wieder halb kopflastig trimmen', 'Set the trim half nose down again'),
      },
      'half-up': {
        state: text('halb schwanzlastig', 'half nose up'),
        restore: text('Wieder halb schwanzlastig trimmen', 'Set the trim half nose up again'),
      },
      neutral: {
        state: text('neutral', 'neutral'),
        restore: text('Wieder neutral trimmen', 'Set the trim neutral again'),
      },
    },
    name: text('Trimmrad', 'Trim wheel'),
    description: text(
      'Trimmt das Pendelruder in Stufen. Vorwärts ist kopflastig; für den Start neutral.',
      'Trims the stabilator in steps. Forward is nose down; neutral for take-off.',
    ),
    appearance: controlArtwork.trim,
  },
  parkingBrakeValve: {
    kind: 'toggle',
    positions: ['open', 'closed'],
    initial: 'open',
    legends: { open: 'Off', closed: 'On' },
    name: text('Rückflusshahn', 'Parking-brake valve'),
    description: text(
      'Parkbremse, beschriftet Off, Brake, On: auf On stellen, Bremshebel ziehen und loslassen. Der Druck hält, bis der Hahn wieder auf Off steht.',
      'Parking brake, printed Off, Brake, On: set it to On, pull and release the brake lever. The pressure holds until the valve is back at Off.',
    ),
    appearance: controlArtwork.parkingBrakeValve,
  },
  rescueHandle: {
    kind: 'guarded',
    positions: ['stowed', 'pulled'],
    initial: 'stowed',
    legends: {
      stowed: {
        state: text('in Ruhestellung', 'stowed'),
        restore: text('Wieder in Ruhestellung bringen', 'Stow it again'),
      },
      pulled: {
        state: text('gezogen', 'pulled'),
        restore: text('Wieder ziehen', 'Pull it again'),
      },
    },
    guard: {
      name: text('Sicherungsstift', 'Safety pin'),
      legends: {
        open: {
          state: text('gezogen', 'removed'),
          act: text('Sicherungsstift ziehen', 'Remove the safety pin'),
        },
        closed: {
          state: text('gesteckt', 'in'),
          act: text('Sicherungsstift stecken', 'Fit the safety pin'),
        },
      },
    },
    name: text('Rettungsgerät', 'Rescue system'),
    description: text(
      'Griff des ballistischen Rettungssystems, tief am hinteren Ende der Mittelkonsole zwischen den Sitzen. Am Boden sichert der Sicherungsstift den Auslösehebel; zum Auslösen nach vorn, kräftig, bis zum Anschlag ziehen.',
      'Handle of the ballistic rescue system, low at the aft end of the centre console between the seats. On the ground the safety pin secures the release lever; to deploy, pull it forward, hard, to the stop.',
    ),
    appearance: controlArtwork.rescueHandle,
  },
} as const satisfies ControlRecord;

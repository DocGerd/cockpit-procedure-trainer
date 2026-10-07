import { defineAircraft } from './define-aircraft';
import type { Environment, StepInput, Text, TrainerState } from './types';

export type FixtureState = {
  busPowered: boolean;
  starterMs: number;
  engineRunning: boolean;
  volts: number;
  rpm: number;
};

export const STARTER_MS_TO_START = 1000;

const text = (de: string, en: string): Text => ({ de, en });

const environment: Environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };

const initial: FixtureState = {
  busPowered: false,
  starterMs: 0,
  engineRunning: false,
  volts: 0,
  rpm: 0,
};

const MAGNETO_POSITIONS: readonly (string | number)[] = ['right', 'left', 'both', 'start'];

function step(state: FixtureState, input: StepInput<'alternatorFailure'>): FixtureState {
  const { controls, failures, dtMs } = input;
  const busPowered = controls.master === 'on';
  const magnetosOn = MAGNETO_POSITIONS.includes(controls.ignition ?? 'off');
  const starting = busPowered && magnetosOn && controls.ignition === 'start';
  const starterMs = starting ? state.starterMs + dtMs : 0;
  const engineRunning = magnetosOn && (state.engineRunning || starterMs >= STARTER_MS_TO_START);
  const charging =
    engineRunning && controls.alternatorBreaker === 'in' && !failures.has('alternatorFailure');
  const throttle = typeof controls.throttle === 'number' ? controls.throttle : 0;
  return {
    busPowered,
    starterMs,
    engineRunning,
    volts: charging ? 14 : busPowered ? 12 : 0,
    rpm: engineRunning ? 700 + throttle * 1800 : 0,
  };
}

const runningState = step(
  { ...initial, engineRunning: true },
  {
    controls: {
      master: 'on',
      ignition: 'both',
      throttle: 0,
      alternatorBreaker: 'in',
    },
    failures: new Set(),
    environment,
    dtMs: 0,
  },
);

const engineRunning = (state: TrainerState<FixtureState>) => state.systems.engineRunning;
const busPowered = (state: TrainerState<FixtureState>) => state.systems.busPowered;

const rect = (x: number, y: number) => ({ rect: { x, y, w: 40, h: 40 } });

export const fixtureAircraft = defineAircraft({
  id: 'fixture',
  name: text('Testflugzeug', 'Test aircraft'),
  handbookRevision: text('Teststand 1', 'fixture rev 1'),
  controls: {
    master: {
      kind: 'toggle',
      positions: ['off', 'on'],
      initial: 'off',
      name: text('Hauptschalter', 'Master switch'),
      description: text('Schaltet die Bordspannung ein.', 'Switches the bus on.'),
      appearance: {
        artwork: {
          face: 'master-face.png',
          moving: {
            type: 'positions',
            images: { off: 'master-off.png', on: 'master-on.png' },
          },
        },
      },
    },
    ignition: {
      kind: 'rotary',
      positions: ['off', 'right', 'left', 'both', 'start'],
      initial: 'off',
      springBack: { start: 'both' },
      name: text('Zündschalter', 'Ignition switch'),
      description: text('START ist federbelastet.', 'START is spring loaded.'),
      appearance: { widget: 'rotary-key', options: { capColour: 'black' } },
    },
    throttle: {
      kind: 'lever',
      positions: 'continuous',
      initial: 0,
      name: text('Leistungshebel', 'Throttle'),
      description: text('Stufenlos von Leerlauf bis Vollgas.', 'Idle to full, continuous.'),
      appearance: {
        artwork: {
          face: 'throttle-face.png',
          moving: {
            type: 'travel',
            image: 'throttle-knob.png',
            path: [
              { x: 0, y: 40 },
              { x: 0, y: 0 },
            ],
          },
        },
      },
    },
    flaps: {
      kind: 'lever',
      positions: ['up', 'takeoff', 'landing'],
      initial: 'up',
      name: text('Klappen', 'Flaps'),
      description: text('Rastet in drei Stellungen.', 'Three notches.'),
    },
    lampTest: {
      kind: 'momentary',
      positions: ['released', 'pressed'],
      initial: 'released',
      name: text('Lampentest', 'Lamp test'),
      description: text('Aktiv nur solange gedrückt.', 'Active only while held.'),
    },
    fuelPump: {
      kind: 'guarded',
      positions: ['off', 'on'],
      initial: 'off',
      guard: { name: text('Schutzkappe', 'Guard cover') },
      name: text('Kraftstoffpumpe', 'Fuel pump'),
      description: text('Die Kappe muss zuerst geöffnet werden.', 'Open the cover first.'),
      appearance: { widget: 'rocker', options: { capColour: 'red' } },
    },
    alternatorBreaker: {
      kind: 'breaker',
      positions: ['in', 'pulled'],
      initial: 'in',
      name: text('Sicherung Lichtmaschine', 'Alternator breaker'),
      description: text('Löst bei Lichtmaschinenausfall aus.', 'Trips on alternator failure.'),
    },
  },
  indicators: {
    busVolts: {
      name: text('Bordspannung', 'Bus voltage'),
      select: (state: TrainerState<FixtureState>) => state.systems.volts,
      appearance: {
        artwork: {
          face: 'volts-face.png',
          moving: {
            type: 'needle',
            image: 'volts-needle.png',
            pivot: { x: 20, y: 20 },
            angleRange: { min: -60, max: 60 },
            valueRange: { min: 8, max: 16 },
          },
        },
      },
    },
    rpm: {
      name: text('Drehzahl', 'Engine speed'),
      select: (state: TrainerState<FixtureState>) => state.systems.rpm,
      appearance: {
        widget: 'round-gauge',
        options: {
          range: [0, 3000],
          units: 'rpm',
          arcs: [{ from: 500, to: 2700, colour: 'green' }],
        },
      },
    },
  },
  views: {
    panel: {
      name: text('Instrumententafel', 'Main panel'),
      image: 'panel.png',
      controls: {
        master: rect(10, 10),
        ignition: rect(60, 10),
        throttle: rect(110, 10),
        lampTest: rect(160, 10),
        alternatorBreaker: rect(210, 10),
      },
      indicators: { busVolts: rect(10, 60), rpm: rect(60, 60) },
    },
    console: {
      name: text('Mittelkonsole', 'Centre console'),
      image: 'console.png',
      controls: {
        flaps: { rect: { x: 10, y: 10, w: 40, h: 80 }, position3d: { x: 0, y: 1, z: 2 } },
        fuelPump: { ...rect(60, 10), orientation: { x: 0, y: 90, z: 0 } },
      },
    },
  },
  cockpit: {
    size: { width: 400, height: 300 },
    views: {
      panel: { rect: { x: 0, y: 0, w: 400, h: 100 }, minWidth: 300 },
      console: { rect: { x: 0, y: 100, w: 400, h: 100 }, minWidth: 300 },
    },
    dock: { rect: { x: 0, y: 200, w: 400, h: 100 }, minWidth: 300 },
  },
  systems: { initial, step },
  failures: {
    alternatorFailure: {
      name: text('Lichtmaschinenausfall', 'Alternator failure'),
      trips: ['alternatorBreaker'],
    },
  },
  phases: {
    parking: {
      name: text('Parkposition', 'Parking'),
      image: 'parking.png',
      environment,
      entry: {
        controls: {
          master: 'off',
          ignition: 'off',
          throttle: 0,
          flaps: 'up',
          lampTest: 'released',
          fuelPump: 'off',
          alternatorBreaker: 'in',
        },
        state: initial,
      },
    },
    runup: {
      name: text('Probelauf', 'Run-up'),
      image: 'runup.png',
      environment,
      entry: {
        controls: {
          master: 'on',
          ignition: 'both',
          throttle: 0,
          flaps: 'up',
          lampTest: 'released',
          fuelPump: 'on',
          alternatorBreaker: 'in',
        },
        state: runningState,
      },
    },
  },
  procedures: {
    beforeStart: {
      title: text('Vor dem Anlassen', 'Before start'),
      type: 'normal',
      startPhase: 'parking',
      endPhase: 'runup',
      items: [
        {
          type: 'action',
          control: 'master',
          position: 'on',
          text: text('Hauptschalter EIN', 'Master switch ON'),
        },
        {
          type: 'action',
          control: 'fuelPump',
          position: 'on',
          text: text('Kraftstoffpumpe EIN', 'Fuel pump ON'),
        },
        {
          type: 'check',
          target: { indicator: 'busVolts' },
          condition: busPowered,
          text: text('Bordspannung anliegend', 'Bus voltage present'),
        },
        {
          type: 'confirm',
          text: text('Propellerbereich frei', 'Propeller area clear'),
        },
        {
          type: 'action',
          control: 'ignition',
          position: 'both',
          text: text('Zündung BEIDE', 'Ignition BOTH'),
        },
        {
          type: 'action',
          control: 'ignition',
          position: 'start',
          holdUntil: engineRunning,
          text: text('Anlasser betätigen bis der Motor läuft', 'Crank until the engine runs'),
        },
        {
          type: 'check',
          target: { indicator: 'rpm' },
          condition: engineRunning,
          text: text('Motor läuft', 'Engine running'),
        },
      ],
    },
    alternatorFailure: {
      title: text('Lichtmaschinenausfall', 'Alternator failure'),
      type: 'emergency',
      startPhase: 'runup',
      failure: 'alternatorFailure',
      items: [
        {
          type: 'check',
          target: { control: 'alternatorBreaker' },
          condition: (state) => state.controls.alternatorBreaker === 'pulled',
          text: text('Sicherung ist ausgelöst', 'Breaker has tripped'),
        },
        {
          type: 'confirm',
          text: text('Elektrische Last verringern', 'Reduce electrical load'),
        },
      ],
    },
  },
});

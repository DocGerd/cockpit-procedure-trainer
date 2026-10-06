import { electricalBus, pistonEngineStart } from '@cpt/core';
import { phaseHeadings } from './airfield';
import type {
  ElectricalBusState,
  Environment,
  Magnetos,
  PistonEngineState,
  StepInput,
  SystemsDefinition,
  TrainerState,
} from '@cpt/core';

export type DemoFailure = 'alternatorFailure';

export type DemoState = {
  bus: ElectricalBusState;
  engine: PistonEngineState;
  avionicsPowered: boolean;
  altitudeFt: number;
  rpm: number;
  oilPsi: number;
  amps: number;
  engineHours: number;
  /** Set by the phase entry; nothing turns the aircraft within a phase. */
  headingDeg: number;
};

export type DemoTrainerState = TrainerState<DemoState>;

const bus = electricalBus({ batteryVolts: 12, chargingVolts: 14 });
const engine = pistonEngineStart({ crankMsToStart: 1500 });

const IDLE_RPM = 700;
const FULL_THROTTLE_RPM_GAIN = 1800;
const CRANKING_RPM = 220;
const SINGLE_MAGNETO_RPM_DROP = 80;
const RUNNING_OIL_PSI = 55;
const OIL_PSI_PER_THROTTLE = 15;
const CHARGE_AMPS = 12;
const BASE_LOAD_AMPS = 8;
const AVIONICS_LOAD_AMPS = 6;
const MS_PER_HOUR = 3_600_000;
const LOW_VOLTS = 13;
const LOW_OIL_PSI = 20;

export const initial: DemoState = {
  bus: bus.initial,
  engine: engine.initial,
  avionicsPowered: false,
  altitudeFt: 0,
  rpm: 0,
  oilPsi: 0,
  amps: 0,
  engineHours: 1204.3,
  headingDeg: phaseHeadings.parking,
};

export const step: SystemsDefinition<DemoState, DemoFailure>['step'] = (
  state,
  { controls, failures, environment, dtMs }: StepInput<DemoFailure>,
) => {
  const magnetos = controls.magnetos as Magnetos;
  const throttle = Number(controls.throttle);
  const starterEngaged = controls.starter === 'held';
  const fuelFlows =
    controls.fuelSelector !== 'off' &&
    controls.fuelShutoff === 'open' &&
    Number(controls.mixture) > 0;

  const nextEngine = engine.step(
    state.engine,
    { starterEngaged, magnetos, busPowered: state.bus.busPowered, engineFailed: !fuelFlows },
    dtMs,
  );
  const nextBus = bus.step(
    state.bus,
    {
      masterOn: controls.battery === 'on',
      alternatorOn: controls.alternator === 'on' && controls.alternatorBreaker === 'in',
      engineRunning: nextEngine.running,
      alternatorFailed: failures.has('alternatorFailure'),
    },
    dtMs,
  );
  const avionicsPowered =
    nextBus.busPowered && controls.avionics === 'on' && controls.avionicsBreaker === 'in';

  const cranking = starterEngaged && nextBus.busPowered && !nextEngine.running;
  const dropped = magnetos === 'left' || magnetos === 'right' ? SINGLE_MAGNETO_RPM_DROP : 0;
  const rpm = nextEngine.running
    ? IDLE_RPM + throttle * FULL_THROTTLE_RPM_GAIN - dropped
    : cranking
      ? CRANKING_RPM
      : 0;
  const load = BASE_LOAD_AMPS + (avionicsPowered ? AVIONICS_LOAD_AMPS : 0);

  return {
    bus: nextBus,
    engine: nextEngine,
    avionicsPowered,
    altitudeFt: environment.altitudeFt,
    rpm,
    oilPsi: nextEngine.running ? RUNNING_OIL_PSI + throttle * OIL_PSI_PER_THROTTLE : 0,
    amps: !nextBus.busPowered ? 0 : nextBus.charging ? CHARGE_AMPS : -load,
    headingDeg: state.headingDeg,
    engineHours: state.engineHours + (nextEngine.running ? dtMs / MS_PER_HOUR : 0),
  };
};

const lampTest = (state: DemoTrainerState) => state.controls.annunciator === 'test';

export const lowVoltageLit = (state: DemoTrainerState) =>
  state.systems.bus.busPowered && (state.systems.bus.volts < LOW_VOLTS || lampTest(state));

export const oilPressureLit = (state: DemoTrainerState) =>
  state.systems.bus.busPowered && (state.systems.oilPsi < LOW_OIL_PSI || lampTest(state));

const GROUND: Environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };

export const runningFrom = (
  controls: StepInput<DemoFailure>['controls'],
  environment: Environment = GROUND,
): DemoState =>
  step(
    { ...initial, engine: { running: true, crankMs: 0 } },
    {
      controls,
      failures: new Set(),
      environment,
      dtMs: 0,
    },
  );

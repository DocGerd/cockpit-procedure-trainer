import { electricalBus, pistonEngineStart } from '@cpt/core';
import type {
  ControlPosition,
  Environment,
  Magnetos,
  PistonEngineState,
  Positions,
  StepInput,
  SystemsDefinition,
  TrainerState,
} from '@cpt/core';
import type { CtslFailure } from './failures';

export type CtslState = {
  bus: { mainPowered: boolean; avionicsPowered: boolean; charging: boolean };
  engine: PistonEngineState;
  rpm: number;
  oilPressureBar: number;
  oilTempC: number;
  chtC: number;
  flaps: { angle: number; moving: boolean };
  parkingBrakeSet: boolean;
  eltTransmitting: boolean;
  rescueDeployed: boolean;
  fire: boolean;
  airspeedKmh: number;
  altitudeFt: number;
  verticalSpeedMs: number;
  onGround: boolean;
  starter: { cranking: boolean; crankMs: number; coolingMs: number };
  fuelInLinesMs: number;
  oilStarvedMs: number;
  brakeApplied: boolean;
  consumers: {
    beacon: boolean;
    positionLights: boolean;
    landingLight: boolean;
    cockpitLight: boolean;
    intercom: boolean;
    outlet: boolean;
  };
};

export type CtslTrainerState = TrainerState<CtslState>;

type Throttle = 'idle' | 'low' | 'runup' | 'cruise' | 'full';

// Limits from docs/aircraft/ctsl-intake.md §4. The other values are trainer assumptions, with time
// constants compressed to fit the walk-through bound (M6 plan, pre-flight check f).
const KMH_PER_KT = 1.852;
const AMBIENT_TEMP_C = 15;

const STARTER_LIMIT_MS = 10_000;
const STARTER_COOLING_MS = 120_000;
const CRANK_MS_TO_START = 1500;
const WARM_OIL_C = 50;

const IDLE_RPM = 1400;
const MAX_CONTINUOUS_RPM = 5500;
const GROUND_RPM: Record<Throttle, number> = {
  idle: IDLE_RPM,
  low: 2500,
  runup: 4000,
  cruise: 4800,
  full: 5000,
};
const CLIMB_FULL_RPM = 4800;
const BEST_CLIMB_KMH = 105;
const LEVEL_FLIGHT_MAX_KMH = 240;
const LEFT_CIRCUIT_DROP_RPM = 150;
const RIGHT_CIRCUIT_DROP_RPM = 200;
const WINDMILL_RPM_PER_KMH = 2;
const RELIGHT_MIN_RPM = 200;

const FUEL_IN_LINES_MS = 5000;
const FUEL_FLOW_REFERENCE_RPM = GROUND_RPM.full;

const TEMP_TIME_CONSTANT_MS = 20_000;
const OIL_PRESSURE_TIME_CONSTANT_MS = 1000;
const OIL_TEMP_IDLE_C = 60;
const OIL_TEMP_MAX_POWER_C = 100;
const CHT_IDLE_C = 70;
const CHT_MAX_POWER_C = 110;
const OIL_PRESSURE_IDLE_BAR = 2.5;
const OIL_PRESSURE_MAX_POWER_BAR = 4.5;
const OIL_PRESSURE_COLD_EXTRA_BAR = 2;
const COOLANT_LOSS_CHT_RISE_C = 80;
const OIL_LOSS_TEMP_RISE_C = 50;
const OIL_LOSS_SEIZURE_MS = 60_000;

const FLAP_DETENTS = [-12, 0, 15, 30, 35] as const;
const FLAP_END_SWITCH_UP_DEG = -14;
const FLAP_END_SWITCH_DOWN_DEG = 37;
const FLAP_DEG_PER_MS = 5 / 1000;
const MAX_FLAP_SPEED_KMH: Record<number, number> = { 0: 184, 15: 148, 30: 115, 35: 115 };

const bus = electricalBus({ batteryVolts: 12, chargingVolts: 14 });
const engineBlock = pistonEngineStart({ crankMsToStart: CRANK_MS_TO_START });

export const initial: CtslState = {
  bus: { mainPowered: false, avionicsPowered: false, charging: false },
  engine: engineBlock.initial,
  rpm: 0,
  oilPressureBar: 0,
  oilTempC: AMBIENT_TEMP_C,
  chtC: AMBIENT_TEMP_C,
  flaps: { angle: 0, moving: false },
  parkingBrakeSet: true,
  eltTransmitting: false,
  rescueDeployed: false,
  fire: false,
  airspeedKmh: 0,
  altitudeFt: 0,
  verticalSpeedMs: 0,
  onGround: true,
  starter: { cranking: false, crankMs: 0, coolingMs: 0 },
  fuelInLinesMs: 0,
  oilStarvedMs: 0,
  brakeApplied: false,
  consumers: {
    beacon: false,
    positionLights: false,
    landingLight: false,
    cockpitLight: false,
    intercom: false,
    outlet: false,
  },
};

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

const approach = (value: number, target: number, dtMs: number, timeConstantMs: number) =>
  target + (value - target) * Math.exp(-dtMs / timeConstantMs);

const magnetosOf = (ignition: ControlPosition | undefined): Magnetos => {
  if (ignition === 'left' || ignition === 'right' || ignition === 'both') return ignition;
  return ignition === 'start' ? 'both' : 'off';
};

const throttleOf = (position: ControlPosition | undefined): Throttle =>
  position !== undefined && Object.hasOwn(GROUND_RPM, position) ? (position as Throttle) : 'idle';

const fullThrottleRpm = (airspeedKmh: number, onGround: boolean) => {
  if (onGround) return GROUND_RPM.full;
  const share = clamp(
    (airspeedKmh - BEST_CLIMB_KMH) / (LEVEL_FLIGHT_MAX_KMH - BEST_CLIMB_KMH),
    0,
    1,
  );
  return Math.round(CLIMB_FULL_RPM + share * (MAX_CONTINUOUS_RPM - CLIMB_FULL_RPM));
};

const circuitDrop = (magnetos: Magnetos) =>
  magnetos === 'left' ? LEFT_CIRCUIT_DROP_RPM : magnetos === 'right' ? RIGHT_CIRCUIT_DROP_RPM : 0;

const runningRpm = (
  throttle: Throttle,
  magnetos: Magnetos,
  airspeedKmh: number,
  onGround: boolean,
) =>
  (throttle === 'full' ? fullThrottleRpm(airspeedKmh, onGround) : GROUND_RPM[throttle]) -
  circuitDrop(magnetos);

const windmillRpm = (airspeedKmh: number, onGround: boolean) =>
  onGround ? 0 : Math.round(airspeedKmh * WINDMILL_RPM_PER_KMH);

const power = (rpm: number) => clamp((rpm - IDLE_RPM) / (MAX_CONTINUOUS_RPM - IDLE_RPM), 0, 1);

type Gauges = Pick<CtslState, 'oilPressureBar' | 'oilTempC' | 'chtC'>;

const settledGauges = (
  running: boolean,
  rpm: number,
  oilTempC: number,
  failures: ReadonlySet<CtslFailure>,
): Gauges => {
  if (!running) return { oilPressureBar: 0, oilTempC: AMBIENT_TEMP_C, chtC: AMBIENT_TEMP_C };
  const load = power(rpm);
  const coldness = clamp((WARM_OIL_C - oilTempC) / (WARM_OIL_C - AMBIENT_TEMP_C), 0, 1);
  const oilLoss = failures.has('oilLoss');
  return {
    oilPressureBar: oilLoss
      ? 0
      : OIL_PRESSURE_IDLE_BAR +
        load * (OIL_PRESSURE_MAX_POWER_BAR - OIL_PRESSURE_IDLE_BAR) +
        coldness * OIL_PRESSURE_COLD_EXTRA_BAR,
    oilTempC:
      OIL_TEMP_IDLE_C +
      load * (OIL_TEMP_MAX_POWER_C - OIL_TEMP_IDLE_C) +
      (oilLoss ? OIL_LOSS_TEMP_RISE_C : 0),
    chtC:
      CHT_IDLE_C +
      load * (CHT_MAX_POWER_C - CHT_IDLE_C) +
      (failures.has('coolantLoss') ? load * COOLANT_LOSS_CHT_RISE_C : 0),
  };
};

const flapTarget = (
  selector: ControlPosition | undefined,
  failures: ReadonlySet<CtslFailure>,
): number | undefined => {
  if (selector === 'override-up') return FLAP_END_SWITCH_UP_DEG;
  if (selector === 'override-down') return FLAP_END_SWITCH_DOWN_DEG;
  if (failures.has('flapControlFailure')) return undefined;
  const detent = Number(selector);
  return Number.isFinite(detent) ? detent : undefined;
};

const maxFlapSpeedBeyond = (angle: number) => {
  const next = FLAP_DETENTS.find((detent) => detent > angle) ?? FLAP_DETENTS.at(-1);
  return next === undefined ? Infinity : (MAX_FLAP_SPEED_KMH[next] ?? Infinity);
};

const stepFlaps = (
  flaps: CtslState['flaps'],
  powered: boolean,
  target: number | undefined,
  airspeedKmh: number,
  dtMs: number,
): CtslState['flaps'] => {
  if (!powered || target === undefined || target === flaps.angle) {
    return { angle: flaps.angle, moving: false };
  }
  const extending = target > flaps.angle;
  if (extending && airspeedKmh > maxFlapSpeedBeyond(flaps.angle)) {
    return { angle: flaps.angle, moving: true };
  }
  const travel = FLAP_DEG_PER_MS * dtMs;
  const angle = extending
    ? Math.min(target, flaps.angle + travel)
    : Math.max(target, flaps.angle - travel);
  return { angle, moving: angle !== target };
};

const on = (controls: Positions, id: string, position = 'on') => controls[id] === position;

export const step: SystemsDefinition<CtslState, CtslFailure>['step'] = (
  state,
  { controls, failures, environment, dtMs },
) => {
  const airspeedKmh = environment.airspeedKt * KMH_PER_KT;
  const { onGround } = environment;
  const valveOpen = on(controls, 'fuelValve', 'open');
  const throttle = throttleOf(controls.throttle);
  const magnetos = magnetosOf(controls.ignition);
  const masterOn = on(controls, 'battery', 'in');

  const fuelInLinesMs = valveOpen
    ? FUEL_IN_LINES_MS
    : Math.max(
        0,
        state.fuelInLinesMs -
          (state.engine.running ? (dtMs * state.rpm) / FUEL_FLOW_REFERENCE_RPM : 0),
      );
  const seized = state.oilStarvedMs >= OIL_LOSS_SEIZURE_MS;

  const keyAtStart = controls.ignition === 'start' && valveOpen;
  const cooling = Math.max(0, state.starter.coolingMs - dtMs);
  const crankable = keyAtStart && masterOn && cooling === 0 && !state.engine.running;
  const crankMs = crankable ? state.starter.crankMs + dtMs : 0;
  const overheated = crankMs >= STARTER_LIMIT_MS;
  const starter = overheated
    ? { cranking: false, crankMs: 0, coolingMs: STARTER_COOLING_MS }
    : { cranking: crankable, crankMs, coolingMs: cooling };

  const mixtureStarts =
    state.oilTempC >= WARM_OIL_C || (on(controls, 'choke') && throttle === 'idle');
  const windmilling = !seized && windmillRpm(airspeedKmh, onGround) >= RELIGHT_MIN_RPM;
  const engine = engineBlock.step(
    state.engine,
    {
      starterEngaged: (starter.cranking && mixtureStarts) || windmilling,
      magnetos,
      busPowered: true,
      engineFailed: failures.has('engineStoppage') || fuelInLinesMs <= 0 || seized,
    },
    dtMs,
  );

  const electrical = bus.step(
    { busPowered: state.bus.mainPowered, charging: state.bus.charging, volts: 0 },
    {
      masterOn,
      alternatorOn: on(controls, 'generator', 'in'),
      engineRunning: engine.running,
      alternatorFailed: failures.has('generatorFailure'),
    },
    dtMs,
  );
  const mainPowered = electrical.busPowered;

  const rpm = engine.running
    ? runningRpm(throttle, magnetos, airspeedKmh, onGround)
    : seized
      ? 0
      : windmillRpm(airspeedKmh, onGround);

  const settled = settledGauges(engine.running, rpm, state.oilTempC, failures);
  const oilStarvedMs =
    engine.running && failures.has('oilLoss') ? state.oilStarvedMs + dtMs : state.oilStarvedMs;

  const brakeApplied = on(controls, 'brake');
  const parkingBrakeSet = !on(controls, 'parkingBrakeValve', 'closed')
    ? false
    : state.parkingBrakeSet || (brakeApplied && !state.brakeApplied);

  const consumer = (rocker: string, breaker: string) =>
    mainPowered && on(controls, rocker) && on(controls, breaker, 'in');

  return {
    bus: {
      mainPowered,
      avionicsPowered: mainPowered && on(controls, 'avionicsMaster'),
      charging: electrical.charging,
    },
    engine,
    rpm,
    oilPressureBar: approach(
      state.oilPressureBar,
      settled.oilPressureBar,
      dtMs,
      OIL_PRESSURE_TIME_CONSTANT_MS,
    ),
    oilTempC: approach(state.oilTempC, settled.oilTempC, dtMs, TEMP_TIME_CONSTANT_MS),
    chtC: approach(state.chtC, settled.chtC, dtMs, TEMP_TIME_CONSTANT_MS),
    flaps: stepFlaps(
      state.flaps,
      mainPowered && on(controls, 'flapBreaker', 'in'),
      flapTarget(controls.flapSelector, failures),
      airspeedKmh,
      dtMs,
    ),
    parkingBrakeSet,
    eltTransmitting: on(controls, 'elt'),
    rescueDeployed: state.rescueDeployed || on(controls, 'rescueHandle', 'pulled'),
    fire: failures.has('engineFire') && (valveOpen || engine.running),
    airspeedKmh,
    altitudeFt: environment.altitudeFt,
    verticalSpeedMs: state.verticalSpeedMs,
    onGround,
    starter,
    fuelInLinesMs,
    oilStarvedMs,
    brakeApplied,
    consumers: {
      beacon: consumer('beacon', 'strobeBreaker'),
      positionLights: consumer('positionLights', 'positionBreaker'),
      landingLight: consumer('landingLight', 'landingBreaker'),
      cockpitLight: mainPowered && on(controls, 'cockpitLight'),
      intercom: consumer('intercom', 'intercomBreaker'),
      outlet: mainPowered && on(controls, 'outletBreaker', 'in'),
    },
  };
};

const GROUND: Environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };

const detentAngle = (selector: ControlPosition | undefined) => {
  const angle = Number(selector);
  return Number.isFinite(angle) ? angle : 0;
};

export const runningFrom = (
  controls: StepInput<CtslFailure>['controls'],
  environment: Environment = GROUND,
): CtslState => {
  const input = { controls, failures: new Set<CtslFailure>(), environment, dtMs: 0 };
  const running = step(
    {
      ...initial,
      engine: { running: true, crankMs: 0 },
      oilTempC: OIL_TEMP_MAX_POWER_C,
      fuelInLinesMs: FUEL_IN_LINES_MS,
      flaps: { angle: detentAngle(controls.flapSelector), moving: false },
      parkingBrakeSet: controls.parkingBrakeValve === 'closed',
      brakeApplied: controls.brake === 'on',
    },
    input,
  );
  return { ...running, ...settledGauges(true, running.rpm, running.oilTempC, input.failures) };
};

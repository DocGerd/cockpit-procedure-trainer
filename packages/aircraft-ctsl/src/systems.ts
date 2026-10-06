import type {
  ControlPosition,
  Environment,
  PistonEngineState,
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
};

export type CtslTrainerState = TrainerState<CtslState>;

const KMH_PER_KT = 1.852;
const AMBIENT_TEMP_C = 15;

const GROUND: Environment = { airspeedKt: 0, altitudeFt: 0, onGround: true };

export const initial: CtslState = {
  bus: { mainPowered: false, avionicsPowered: false, charging: false },
  engine: { running: false, crankMs: 0 },
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
};

const withEnvironment = (state: CtslState, environment: Environment): CtslState => ({
  ...state,
  airspeedKmh: environment.airspeedKt * KMH_PER_KT,
  altitudeFt: environment.altitudeFt,
  onGround: environment.onGround,
});

export const step: SystemsDefinition<CtslState, CtslFailure>['step'] = (state, { environment }) =>
  withEnvironment(state, environment);

const detentAngle = (selector: ControlPosition | undefined) => {
  const angle = Number(selector);
  return Number.isFinite(angle) ? angle : 0;
};

export const runningFrom = (
  controls: StepInput<CtslFailure>['controls'],
  environment: Environment = GROUND,
): CtslState => {
  const engine = { running: true, crankMs: 0 };
  const charging = controls.generator === 'in';
  const mainPowered = controls.battery === 'in' || charging;
  return step(
    {
      ...initial,
      engine,
      bus: {
        mainPowered,
        avionicsPowered: mainPowered && controls.avionicsMaster === 'on',
        charging,
      },
      flaps: { angle: detentAngle(controls.flapSelector), moving: false },
      parkingBrakeSet: controls.parkingBrakeValve === 'closed',
    },
    { controls, failures: new Set(), environment, dtMs: 0 },
  );
};

import type { SoundDefinition } from '@cpt/core';
import {
  flapMotorRunning,
  GEARBOX_RATIO,
  IDLE_RPM,
  MAX_CONTINUOUS_RPM,
  on,
  type CtslState,
  type CtslTrainerState,
} from './systems';

// Intake §4.3: the airspeed red line.
const AIRSPEED_RED_LINE_KMH = 300;
// Intake §9 question 1: four cylinders and the four-stroke cycle, handbook facts.
const CYLINDERS = 4;

const starterTurning = ({ controls }: CtslTrainerState) =>
  on(controls, 'ignition', 'start') && on(controls, 'battery', 'in');

export const sounds: Readonly<Record<string, SoundDefinition<CtslState>>> = {
  engine: {
    voice: 'piston-engine',
    // Blade count is open (intake §9 question 11), so the ratio renders no blade-pass tone yet.
    options: {
      cylinders: CYLINDERS,
      idleRpm: IDLE_RPM,
      maxContinuousRpm: MAX_CONTINUOUS_RPM,
      gearboxRatio: GEARBOX_RATIO,
    },
    inputs: {
      rpm: ({ systems }) => systems.rpm,
      running: ({ systems }) => (systems.engine.running ? 1 : 0),
      starter: (state) => (starterTurning(state) ? 1 : 0),
    },
    carried: ['rpm'],
  },
  airflow: {
    voice: 'airflow',
    options: { referenceKmh: AIRSPEED_RED_LINE_KMH },
    inputs: { airspeedKmh: ({ systems }) => systems.airspeedKmh },
    carried: ['airspeedKmh'],
  },
  flaps: {
    voice: 'electric-motor',
    inputs: { driving: (state) => (flapMotorRunning(state) ? 1 : 0) },
  },
};

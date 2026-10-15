import type { JsonObject, JsonValue } from '@cpt/core';
import type { VoiceFactory } from '../voice-factories';
import { continuousVoice } from './continuous-voice';

type ElectricMotorOptions = {
  /** The whine's pitch at full speed. */
  readonly whineHz: number;
  /** Time constant of the fade in and out, in milliseconds. */
  readonly fadeMs: number;
};

// Voice defaults tuned by ear, not aircraft facts.
export const electricMotorDefaults: ElectricMotorOptions = { whineHz: 520, fadeMs: 120 };

export const LEVEL = 0.05;
export const SPIN_UP_PITCH_SHARE = 0.6;
const HARMONICS = 4;
const BRIGHTNESS_HARMONICS = 3;

const isPositive = (value: JsonValue | undefined) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

export const electricMotorProblems = (options: JsonObject): readonly string[] => {
  const problems = Object.keys(options)
    .filter((key) => !Object.hasOwn(electricMotorDefaults, key))
    .map((key) => `unknown option ${key}`);
  for (const key of Object.keys(electricMotorDefaults)) {
    if (Object.hasOwn(options, key) && !isPositive(options[key])) {
      problems.push(`option ${key} is out of range`);
    }
  }
  return problems;
};

export const electricMotor: VoiceFactory = {
  create(out, options) {
    const problems = electricMotorProblems(options);
    if (problems.length > 0) throw new Error(`electric-motor: ${problems.join('; ')}`);
    const { whineHz, fadeMs } = { ...electricMotorDefaults, ...options } as ElectricMotorOptions;
    return continuousVoice(out, {
      input: 'driving',
      smoothingS: fadeMs / 1000,
      targets(driving) {
        const share = Math.min(driving, 1);
        return {
          gain: LEVEL * share,
          pitch: whineHz * (SPIN_UP_PITCH_SHARE + (1 - SPIN_UP_PITCH_SHARE) * share),
        };
      },
      build(context, node, output) {
        const whine = node(context.createOscillator());
        const imag = [0, ...Array.from({ length: HARMONICS }, (_, index) => 1 / (index + 1))];
        whine.setPeriodicWave(
          context.createPeriodicWave(
            imag.map(() => 0),
            imag,
          ),
        );
        const filter = node(context.createBiquadFilter());
        filter.type = 'lowpass';
        filter.frequency.value = whineHz * BRIGHTNESS_HARMONICS;
        const gain = node(context.createGain());
        whine.connect(filter).connect(gain).connect(output);
        return { params: { gain: gain.gain, pitch: whine.frequency }, sources: [whine] };
      },
    });
  },
  problems: electricMotorProblems,
};

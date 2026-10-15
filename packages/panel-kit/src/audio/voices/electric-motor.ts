import type { JsonObject } from '@cpt/core';
import type { VoiceFactory } from '../voice-factories';
import { continuousVoice, inRange } from './continuous-voice';

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

// Keeps the brightness low-pass within the Nyquist frequency of a 44.1 kHz context.
export const WHINE_HZ_RANGE = [20, 44_100 / 2 / BRIGHTNESS_HARMONICS] as const;
// A shorter fade clicks.
export const FADE_MS_RANGE = [10, 2000] as const;

const OPTION_RANGES: Readonly<Record<keyof ElectricMotorOptions, readonly [number, number]>> = {
  whineHz: WHINE_HZ_RANGE,
  fadeMs: FADE_MS_RANGE,
};

export const electricMotorProblems = (options: JsonObject): readonly string[] => {
  const problems = Object.keys(options)
    .filter((key) => !Object.hasOwn(OPTION_RANGES, key))
    .map((key) => `unknown option ${key}`);
  for (const [key, [min, max]] of Object.entries(OPTION_RANGES)) {
    if (Object.hasOwn(options, key) && !inRange(options[key], min, max)) {
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

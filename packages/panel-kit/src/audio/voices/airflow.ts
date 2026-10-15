import type { JsonObject } from '@cpt/core';
import type { VoiceFactory } from '../voice-factories';
import { continuousVoice, inRange, SMOOTHING_S } from './continuous-voice';
import { noiseSource } from './noise';

type AirflowOptions = {
  /** The airspeed at which the airflow reaches its reference level. */
  readonly referenceKmh: number;
};

const OPTION_KEYS: readonly string[] = ['referenceKmh'] satisfies (keyof AirflowOptions)[];

/** The plausible airspeed red lines, in km/h. */
export const REFERENCE_KMH_RANGE = [50, 1000] as const;

// Voice defaults tuned by ear, not aircraft facts.
export const LEVEL = 0.35;
export const MAX_RATIO = 1.5;
export const MIN_CUTOFF_HZ = 150;
export const CUTOFF_HZ_PER_REFERENCE = 3000;

export const airflowProblems = (options: JsonObject): readonly string[] => {
  const problems = Object.keys(options)
    .filter((key) => !OPTION_KEYS.includes(key))
    .map((key) => `unknown option ${key}`);
  if (!Object.hasOwn(options, 'referenceKmh')) problems.push('missing option referenceKmh');
  else if (!inRange(options.referenceKmh, ...REFERENCE_KMH_RANGE)) {
    problems.push('option referenceKmh is out of range');
  }
  return problems;
};

export const airflow: VoiceFactory = {
  create(out, options) {
    const problems = airflowProblems(options);
    if (problems.length > 0) throw new Error(`airflow: ${problems.join('; ')}`);
    const { referenceKmh } = options as AirflowOptions;
    return continuousVoice(out, {
      input: 'airspeedKmh',
      smoothingS: SMOOTHING_S,
      targets(airspeedKmh) {
        const ratio = Math.min(airspeedKmh / referenceKmh, MAX_RATIO);
        return {
          gain: LEVEL * ratio ** 2,
          cutoff: MIN_CUTOFF_HZ + CUTOFF_HZ_PER_REFERENCE * ratio,
        };
      },
      build(context, node, output) {
        const noise = node(noiseSource(context));
        const filter = node(context.createBiquadFilter());
        filter.type = 'lowpass';
        const gain = node(context.createGain());
        noise.connect(filter).connect(gain).connect(output);
        return { params: { gain: gain.gain, cutoff: filter.frequency }, sources: [noise] };
      },
    });
  },
  problems: airflowProblems,
};

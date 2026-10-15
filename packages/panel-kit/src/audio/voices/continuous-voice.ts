import { STEP_MS } from '@cpt/core';
import type { JsonValue } from '@cpt/core';
import type { AudioOut } from '../audio-engine';
import type { Voice, VoiceFrame } from '../voice-factories';

/** The glide a jump takes: nearly done within one tick, with no hard step to click. */
export const SMOOTHING_S = STEP_MS / 3 / 1000;

// A change too small to hear is not scheduled. Relative to the value, as loudness and pitch are
// heard; absolute near 0.
export const AUTOMATION_DEADBAND = 1e-4;
export const RELATIVE_DEADBAND = 1e-3;
export const FADE_TIME_CONSTANT_S = 0.03;
export const TIME_CONSTANTS_TO_SILENCE = 10;

const inaudible = (next: number, issued: number) =>
  Math.abs(next - issued) <= Math.max(AUTOMATION_DEADBAND, RELATIVE_DEADBAND * Math.abs(issued));

/** Whether an option value is a number from `min` to `max`, both included. */
export const inRange = (value: JsonValue | undefined, min: number, max: number) =>
  typeof value === 'number' && value >= min && value <= max;

type Node = <T extends AudioNode>(created: T) => T;

export type ContinuousVoiceSpec<K extends string> = {
  /** The one input the voice follows; a missing, negative or non-finite reading counts as 0. */
  readonly input: string;
  /** Time constant of the glide to a stepped target, in seconds; a jump glides over `SMOOTHING_S`. */
  readonly smoothingS: number;
  /** The parameter values an input reading stands for. */
  targets(reading: number): Record<K, number>;
  /** Builds the graph into `output`; the caller starts the returned sources. */
  build(
    context: BaseAudioContext,
    node: Node,
    output: GainNode,
  ): { params: Record<K, AudioParam>; sources: AudioScheduledSourceNode[] };
};

/** A voice whose parameters are a pure function of one input, glided to and jumped on request. */
export function continuousVoice<K extends string>(
  { context, input }: AudioOut,
  spec: ContinuousVoiceSpec<K>,
): Voice {
  const nodes: AudioNode[] = [];
  const disconnect = () => {
    for (const each of nodes) each.disconnect();
  };
  try {
    const node: Node = (created) => {
      nodes.push(created);
      return created;
    };
    const output = node(context.createGain());
    output.connect(input);
    const { params, sources } = spec.build(context, node, output);
    const names = Object.keys(params) as K[];

    const issued = spec.targets(0);
    for (const name of names) params[name].value = issued[name];
    for (const source of sources) source.start();

    let stopped = false;
    return {
      update(inputs, { live, jump }: VoiceFrame) {
        // Nothing is issued while not live; the driver passes a jump when live returns.
        if (stopped || !live) return;
        const reading = inputs[spec.input];
        const next = spec.targets(
          reading !== undefined && Number.isFinite(reading) && reading > 0 ? reading : 0,
        );
        const at = context.currentTime;
        const jumps = jump.includes(spec.input);
        for (const name of names) {
          if (!jumps && inaudible(next[name], issued[name])) continue;
          params[name].setTargetAtTime(next[name], at, jumps ? SMOOTHING_S : spec.smoothingS);
          issued[name] = next[name];
        }
      },
      stop() {
        if (stopped) return;
        stopped = true;
        const now = context.currentTime;
        output.gain.cancelScheduledValues(now);
        output.gain.setTargetAtTime(0, now, FADE_TIME_CONSTANT_S);
        // A context that is not running plays nothing to fade, and fires no `ended` until it runs.
        const running = context.state === 'running';
        const end = running ? now + FADE_TIME_CONSTANT_S * TIME_CONSTANTS_TO_SILENCE : now;
        const [first] = sources;
        if (running && first) first.addEventListener('ended', disconnect, { once: true });
        for (const source of sources) source.stop(end);
        if (!running || !first) disconnect();
      },
    };
  } catch (error) {
    // A failed create hands the driver no voice, so nothing else could stop this partial graph.
    disconnect();
    throw error;
  }
}

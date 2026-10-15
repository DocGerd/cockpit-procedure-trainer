import { describe, expect, it } from 'vitest';
import type { FakeAudioParam, FakeConstantSourceNode, FakeGainNode } from '../fake-audio-context';
import { FakeAudioContext } from '../fake-audio-context';
import type { VoiceFrame } from '../voice-factories';
import {
  AUTOMATION_DEADBAND,
  continuousVoice,
  FADE_TIME_CONSTANT_S,
  inRange,
  RELATIVE_DEADBAND,
  SMOOTHING_S,
  TIME_CONSTANTS_TO_SILENCE,
} from './continuous-voice';

const STEP_S = 0.2;
const INPUT = 'reading';

function setup() {
  const context = new FakeAudioContext();
  context.setState('running');
  const master = context.createGain();
  master.connect(context.destination);
  const before = context.nodes.length;
  const built: { output?: FakeGainNode; level?: FakeGainNode; source?: FakeConstantSourceNode } =
    {};
  const voice = continuousVoice(
    { context: context.asAudioContext(), input: master as unknown as AudioNode },
    {
      input: INPUT,
      smoothingS: STEP_S,
      targets: (reading) => ({ level: reading }),
      build(audio, node, output) {
        const source = node(audio.createConstantSource());
        const level = node(audio.createGain());
        source.connect(level).connect(output);
        Object.assign(built, { output, level, source });
        return { params: { level: level.gain }, sources: [source] };
      },
    },
  );
  const { output, level, source } = built;
  if (!output || !level || !source) throw new Error('expected the stub graph');
  const frame = (jump: readonly string[] = [], live = true): VoiceFrame => ({
    nowMs: context.currentTime * 1000,
    live,
    jump,
  });
  return {
    context,
    master,
    graph: context.nodes.slice(before),
    voice,
    output,
    source,
    param: level.gain,
    set(reading: number, jump: readonly string[] = [], live = true) {
      voice.update({ [INPUT]: reading }, frame(jump, live));
    },
    frame,
  };
}

const glides = (param: FakeAudioParam) =>
  param.calls.filter(({ method }) => method === 'setTargetAtTime').map(({ args }) => args);

describe('continuous voice', () => {
  it('starts at the targets of a 0 reading and starts its sources', () => {
    const { param, source } = setup();
    expect(param.value).toBe(0);
    expect(source.startedAt).toBeDefined();
  });

  it('skips a change inside the dead band and schedules one just outside it', () => {
    const { param, set } = setup();
    set(1);
    const band = Math.max(AUTOMATION_DEADBAND, RELATIVE_DEADBAND);
    const calls = param.calls.length;
    set(1 + 0.9 * band);
    expect(param.calls).toHaveLength(calls);
    set(1 + 1.1 * band);
    expect(glides(param).at(-1)).toEqual([1 + 1.1 * band, 0, STEP_S]);
  });

  it('measures a creep from the last scheduled value, so it schedules once it crosses the band', () => {
    const { param, set } = setup();
    set(1);
    const band = Math.max(AUTOMATION_DEADBAND, RELATIVE_DEADBAND);
    const calls = param.calls.length;
    set(1 + 0.4 * band);
    set(1 + 0.8 * band);
    expect(param.calls).toHaveLength(calls);
    set(1 + 1.2 * band);
    expect(param.calls).toHaveLength(calls + 1);
  });

  it('holds an absolute dead band near 0', () => {
    const { param, set } = setup();
    set(0.9 * AUTOMATION_DEADBAND);
    expect(param.calls.filter(({ method }) => method !== 'value')).toEqual([]);
    set(1.1 * AUTOMATION_DEADBAND);
    expect(glides(param)).toEqual([[1.1 * AUTOMATION_DEADBAND, 0, STEP_S]]);
  });

  it('glides a step over its own time constant and a jump over SMOOTHING_S, in one call each', () => {
    const { context, param, set } = setup();
    set(1);
    context.currentTime = 0.5;
    const calls = param.calls.length;
    set(0.25, [INPUT]);
    expect(param.calls.slice(calls)).toEqual([
      { method: 'setTargetAtTime', args: [0.25, 0.5, SMOOTHING_S] },
    ]);
  });

  it('jumps even to the value it already glides to', () => {
    const { param, set } = setup();
    set(1);
    set(1, [INPUT]);
    expect(glides(param)).toEqual([
      [1, 0, STEP_S],
      [1, 0, SMOOTHING_S],
    ]);
  });

  it('glides when a jump names another input', () => {
    const { param, set } = setup();
    set(1, ['other']);
    expect(glides(param)).toEqual([[1, 0, STEP_S]]);
  });

  it('treats a missing, negative or non-finite reading as 0', () => {
    for (const update of [
      (voice: ReturnType<typeof setup>) => voice.voice.update({}, voice.frame()),
      (voice: ReturnType<typeof setup>) => voice.set(-1),
      (voice: ReturnType<typeof setup>) => voice.set(Number.NaN),
      (voice: ReturnType<typeof setup>) => voice.set(Number.POSITIVE_INFINITY),
    ]) {
      const voice = setup();
      voice.set(1);
      update(voice);
      expect(voice.param.value).toBe(0);
    }
  });

  it('issues nothing while not live, and a jump when live returns catches up', () => {
    const { param, set } = setup();
    const calls = param.calls.length;
    set(1, [], false);
    expect(param.calls).toHaveLength(calls);
    set(1, [INPUT]);
    expect(glides(param)).toEqual([[1, 0, SMOOTHING_S]]);
  });

  it('fades the output out on stop, ends the sources after the fade and then disconnects', () => {
    const { context, master, graph, voice, output, source, param, set } = setup();
    set(1);
    context.currentTime = 2;
    voice.stop();
    expect(output.gain.calls.slice(-2)).toEqual([
      { method: 'cancelScheduledValues', args: [2] },
      { method: 'setTargetAtTime', args: [0, 2, FADE_TIME_CONSTANT_S] },
    ]);
    const end = 2 + FADE_TIME_CONSTANT_S * TIME_CONSTANTS_TO_SILENCE;
    expect(source.stoppedAt).toBeCloseTo(end);
    expect(graph.some((node) => node.connections.length > 0)).toBe(true);
    context.currentTime = end;
    expect(source.ended).toBe(true);
    for (const node of graph) expect(node.connections).toEqual([]);
    expect(context.liveNodes()).toEqual([master]);
    const calls = param.calls.length;
    set(0.5, [INPUT]);
    expect(param.calls).toHaveLength(calls);
  });

  it('leaves no node connected and rethrows when the build fails', () => {
    const context = new FakeAudioContext();
    expect(() =>
      continuousVoice(context.out(), {
        input: INPUT,
        smoothingS: STEP_S,
        targets: (reading) => ({ level: reading }),
        build(audio, node, output) {
          node(audio.createConstantSource()).connect(output);
          throw new Error('no graph');
        },
      }),
    ).toThrow('no graph');
    expect(context.nodes.every((node) => node.connections.length === 0)).toBe(true);
  });

  it('accepts a number inside a closed range only', () => {
    expect(inRange(1, 1, 2)).toBe(true);
    expect(inRange(2, 1, 2)).toBe(true);
    for (const value of [0.99, 2.01, Number.NaN, Number.POSITIVE_INFINITY, '1', null, undefined]) {
      expect(inRange(value, 1, 2)).toBe(false);
    }
  });
});

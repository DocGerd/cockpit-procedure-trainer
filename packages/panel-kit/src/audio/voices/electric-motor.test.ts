import { describe, expect, it } from 'vitest';
import type { FakeAudioParam } from '../fake-audio-context';
import { FakeAudioContext, FakeGainNode } from '../fake-audio-context';
import { voiceFactories } from '../voice-factories';
import { FADE_TIME_CONSTANT_S, SMOOTHING_S, TIME_CONSTANTS_TO_SILENCE } from './continuous-voice';
import {
  electricMotor,
  electricMotorDefaults,
  electricMotorProblems,
  FADE_MS_RANGE,
  LEVEL,
  SPIN_UP_PITCH_SHARE,
  WHINE_HZ_RANGE,
} from './electric-motor';

const { whineHz, fadeMs } = electricMotorDefaults;
const pitchFor = (driving: number) =>
  whineHz * (SPIN_UP_PITCH_SHARE + (1 - SPIN_UP_PITCH_SHARE) * driving);

function setup(options = {}) {
  const context = new FakeAudioContext();
  context.setState('running');
  const master = context.createGain();
  master.connect(context.destination);
  const before = context.nodes.length;
  const voice = electricMotor.create(
    { context: context.asAudioContext(), input: master as unknown as AudioNode },
    options,
  );
  const graph = context.nodes.slice(before);
  const [whine] = context.nodesOf('oscillator');
  const [filter] = context.nodesOf('biquad-filter');
  const gain = filter?.connections[0]?.target;
  const output = gain instanceof FakeGainNode ? gain.connections[0]?.target : undefined;
  if (!whine || !filter || !(gain instanceof FakeGainNode) || !(output instanceof FakeGainNode)) {
    throw new Error('expected the motor graph');
  }
  let nowMs = 0;
  return {
    context,
    master,
    graph,
    voice,
    whine,
    filter,
    gain,
    output,
    set(driving: number, jump: readonly string[] = [], live = true) {
      voice.update({ driving }, { nowMs, live, jump });
    },
    advance(ms: number) {
      nowMs += ms;
      context.currentTime = nowMs / 1000;
    },
  };
}

const glides = (param: FakeAudioParam) =>
  param.calls.filter(({ method }) => method === 'setTargetAtTime').map(({ args }) => args);

describe('electric-motor voice', () => {
  it('is registered as electric-motor', () => {
    expect(voiceFactories['electric-motor']).toBe(electricMotor);
  });

  it('runs a periodic whine through a low-pass and a gain to the master', () => {
    const { context, whine, filter, gain, master } = setup();
    expect(whine.periodicWave).toBeDefined();
    expect(whine.startedAt).toBeDefined();
    expect(filter.type).toBe('lowpass');
    expect(context.reaches(whine, filter)).toBe(true);
    expect(context.reaches(filter, gain)).toBe(true);
    expect(context.reaches(gain, master)).toBe(true);
  });

  it('is silent while not driving, with the whine at its spin-up pitch', () => {
    const { gain, whine } = setup();
    expect(gain.gain.value).toBe(0);
    expect(whine.frequency.value).toBe(pitchFor(0));
  });

  it('fades in and out with driving, over the fade time constant', () => {
    const { gain, whine, set, advance } = setup();
    set(1);
    advance(500);
    set(0);
    const fade = fadeMs / 1000;
    expect(glides(gain.gain)).toEqual([
      [LEVEL, 0, fade],
      [0, 0.5, fade],
    ]);
    expect(glides(whine.frequency)).toEqual([
      [whineHz, 0, fade],
      [whineHz * SPIN_UP_PITCH_SHARE, 0.5, fade],
    ]);
  });

  it('follows a partial drive linearly in level and pitch', () => {
    const { gain, whine, set } = setup();
    set(0.5);
    expect(gain.gain.value).toBeCloseTo(LEVEL * 0.5);
    expect(whine.frequency.value).toBeCloseTo((pitchFor(0) + pitchFor(1)) / 2);
  });

  it('takes its options from the caller over the defaults', () => {
    const { gain, whine, set } = setup({ whineHz: 800, fadeMs: 50 });
    set(1);
    expect(glides(gain.gain)).toEqual([[LEVEL, 0, 0.05]]);
    expect(glides(whine.frequency)).toEqual([[800, 0, 0.05]]);
  });

  it('treats a reading above 1 as 1 and a negative or non-finite one as 0', () => {
    const { gain, set } = setup();
    set(7);
    expect(gain.gain.value).toBe(LEVEL);
    for (const reading of [-1, Number.NaN]) {
      set(reading);
      expect(gain.gain.value).toBe(0);
      set(1);
    }
  });

  it('falls silent when the frame lacks driving', () => {
    const { voice, gain, whine, set } = setup();
    set(1);
    voice.update({}, { nowMs: 0, live: true, jump: [] });
    expect(gain.gain.value).toBe(0);
    expect(whine.frequency.value).toBe(pitchFor(0));
  });

  it('schedules nothing while driving holds', () => {
    const { gain, whine, set } = setup();
    set(1);
    const calls = gain.gain.calls.length + whine.frequency.calls.length;
    set(1);
    set(1);
    expect(gain.gain.calls.length + whine.frequency.calls.length).toBe(calls);
  });

  it('glides level and pitch to a jump over SMOOTHING_S, not the fade', () => {
    const { gain, whine, set, advance } = setup();
    set(1);
    advance(100);
    const expected = [
      [gain.gain, 0, gain.gain.calls.length],
      [whine.frequency, pitchFor(0), whine.frequency.calls.length],
    ] as const;
    set(0, ['driving']);
    for (const [param, target, calls] of expected) {
      expect(param.calls.slice(calls)).toEqual([
        { method: 'setTargetAtTime', args: [target, 0.1, SMOOTHING_S] },
      ]);
    }
  });

  it('ignores a jump that names another input', () => {
    const { gain, set } = setup();
    set(1, ['airspeedKmh']);
    expect(glides(gain.gain)).toEqual([[LEVEL, 0, fadeMs / 1000]]);
  });

  it('issues nothing while not live, and a jump when live returns catches up', () => {
    const { gain, set } = setup();
    const calls = gain.gain.calls.length;
    set(1, [], false);
    expect(gain.gain.calls).toHaveLength(calls);
    set(1, ['driving']);
    expect(glides(gain.gain)).toEqual([[LEVEL, 0, SMOOTHING_S]]);
  });

  it('fades out on stop and disconnects every node once the sources end', () => {
    const { context, graph, whine, voice, master, output, gain, set, advance } = setup();
    set(1);
    advance(100);
    voice.stop();
    voice.stop();
    expect(output.gain.calls.slice(-2)).toEqual([
      { method: 'cancelScheduledValues', args: [0.1] },
      { method: 'setTargetAtTime', args: [0, 0.1, FADE_TIME_CONSTANT_S] },
    ]);
    expect(whine.stoppedAt).toBeCloseTo(0.1 + FADE_TIME_CONSTANT_S * TIME_CONSTANTS_TO_SILENCE);
    const calls = gain.gain.calls.length;
    set(0);
    expect(gain.gain.calls).toHaveLength(calls);
    context.currentTime = whine.stoppedAt ?? 0;
    expect(whine.ended).toBe(true);
    for (const node of graph) expect(node.connections).toEqual([]);
    expect(context.liveNodes()).toEqual([master]);
  });

  it('disconnects at once when stopped on a context that is not running', () => {
    const { context, graph, whine, voice } = setup();
    context.setState('suspended');
    voice.stop();
    expect(whine.stoppedAt).toBe(context.currentTime);
    for (const node of graph) expect(node.connections).toEqual([]);
  });

  it('takes no required option and rejects an out-of-range or unknown one', () => {
    expect(electricMotorProblems({})).toEqual([]);
    expect(electricMotorProblems({ whineHz: 800, fadeMs: 50 })).toEqual([]);
    for (const [key, [min, max]] of [
      ['whineHz', WHINE_HZ_RANGE],
      ['fadeMs', FADE_MS_RANGE],
    ] as const) {
      for (const good of [min, max]) expect(electricMotorProblems({ [key]: good })).toEqual([]);
      const bads = [0, -1, min * 0.99, max * 1.01, 1e9, Number.NaN, Number.POSITIVE_INFINITY];
      for (const bad of [...bads, '1', null]) {
        expect(electricMotorProblems({ [key]: bad as number })).toEqual([
          `option ${key} is out of range`,
        ]);
      }
    }
    expect(electricMotorProblems({ extra: 1 })).toEqual(['unknown option extra']);
    expect(electricMotorProblems({ whineHz: 0, fadeMs: 1e9, extra: 1 })).toEqual([
      'unknown option extra',
      'option whineHz is out of range',
      'option fadeMs is out of range',
    ]);
    expect(electricMotor.problems).toBe(electricMotorProblems);
    const context = new FakeAudioContext();
    expect(() => electricMotor.create(context.out(), { fadeMs: 0 })).toThrow(
      /electric-motor: option fadeMs is out of range/,
    );
  });

  it('leaves no node connected when the graph fails to build', () => {
    const context = new FakeAudioContext();
    context.createPeriodicWave = () => {
      throw new Error('no wave');
    };
    expect(() => electricMotor.create(context.out(), {})).toThrow('no wave');
    expect(context.nodes.every((node) => node.connections.length === 0)).toBe(true);
  });
});

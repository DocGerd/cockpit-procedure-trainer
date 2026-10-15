import { describe, expect, it } from 'vitest';
import type { FakeAudioParam, FakeGainNode } from '../fake-audio-context';
import { FakeAudioContext } from '../fake-audio-context';
import { voiceFactories } from '../voice-factories';
import {
  electricMotor,
  electricMotorDefaults,
  electricMotorProblems,
  LEVEL,
  SPIN_UP_PITCH_SHARE,
} from './electric-motor';

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
  const output = graph.find((node) => node.kind === 'gain');
  const gain = context.nodesOf('gain').find((node) => node !== master && node !== output);
  if (!whine || !filter || !output || !gain) throw new Error('expected the motor graph');
  let nowMs = 0;
  return {
    context,
    master,
    graph,
    voice,
    whine,
    filter,
    gain: gain as FakeGainNode,
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

  it('is silent while not driving', () => {
    const { gain } = setup();
    expect(gain.gain.value).toBe(0);
  });

  it('fades in and out with driving, over the fade time constant', () => {
    const { gain, whine, set, advance } = setup();
    set(1);
    advance(500);
    set(0);
    const fade = electricMotorDefaults.fadeMs / 1000;
    expect(glides(gain.gain)).toEqual([
      [LEVEL, 0, fade],
      [0, 0.5, fade],
    ]);
    expect(glides(whine.frequency)).toEqual([
      [electricMotorDefaults.whineHz, 0, fade],
      [electricMotorDefaults.whineHz * SPIN_UP_PITCH_SHARE, 0.5, fade],
    ]);
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

  it('schedules nothing while driving holds', () => {
    const { gain, whine, set } = setup();
    set(1);
    const calls = gain.gain.calls.length + whine.frequency.calls.length;
    set(1);
    set(1);
    expect(gain.gain.calls.length + whine.frequency.calls.length).toBe(calls);
  });

  it('takes the target at once on a jump', () => {
    const { gain, set, advance } = setup();
    set(1);
    advance(100);
    set(0, ['driving']);
    expect(gain.gain.calls.slice(-2)).toEqual([
      { method: 'cancelScheduledValues', args: [0.1] },
      { method: 'setValueAtTime', args: [0, 0.1] },
    ]);
  });

  it('issues nothing while not live', () => {
    const { gain, set } = setup();
    const calls = gain.gain.calls.length;
    set(1, [], false);
    expect(gain.gain.calls).toHaveLength(calls);
  });

  it('fades out on stop and disconnects every node once the sources end', () => {
    const { context, graph, whine, voice, master } = setup();
    voice.stop();
    voice.stop();
    expect(whine.stoppedAt).toBeGreaterThan(0);
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
    for (const key of ['whineHz', 'fadeMs']) {
      for (const bad of [0, -1, Number.NaN, '1', null]) {
        expect(electricMotorProblems({ [key]: bad as number })).toEqual([
          `option ${key} is out of range`,
        ]);
      }
    }
    expect(electricMotorProblems({ extra: 1 })).toEqual(['unknown option extra']);
    expect(electricMotor.problems).toBe(electricMotorProblems);
    const context = new FakeAudioContext();
    expect(() => electricMotor.create(context.out(), { fadeMs: 0 })).toThrow(
      /electric-motor: option fadeMs is out of range/,
    );
  });
});

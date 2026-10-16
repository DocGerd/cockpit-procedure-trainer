import { STEP_MS } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import {
  FakeAudioContext,
  FakeAudioParam,
  FakeBiquadFilterNode,
  FakeGainNode,
} from '../fake-audio-context';
import { voiceFactories } from '../voice-factories';
import {
  airflow,
  airflowProblems,
  CUTOFF_HZ_PER_REFERENCE,
  LEVEL,
  MAX_RATIO,
  MIN_CUTOFF_HZ,
  REFERENCE_KMH_RANGE,
} from './airflow';
import { FADE_TIME_CONSTANT_S, SMOOTHING_S, TIME_CONSTANTS_TO_SILENCE } from './continuous-voice';
import { noiseBuffer } from './noise';

const REFERENCE_KMH = 200;
const OPTIONS = { referenceKmh: REFERENCE_KMH };

function setup(options = OPTIONS) {
  const context = new FakeAudioContext();
  context.setState('running');
  const master = context.createGain();
  master.connect(context.destination);
  const before = context.nodes.length;
  const voice = airflow.create(
    { context: context.asAudioContext(), input: master as unknown as AudioNode },
    options,
  );
  const graph = context.nodes.slice(before);
  const [noise] = context.nodesOf('buffer-source');
  const [filter] = context.nodesOf('biquad-filter') as FakeBiquadFilterNode[];
  const gain = filter?.connections[0]?.target;
  const output = gain instanceof FakeGainNode ? gain.connections[0]?.target : undefined;
  if (!noise || !filter || !(gain instanceof FakeGainNode) || !(output instanceof FakeGainNode)) {
    throw new Error('expected the airflow graph');
  }
  let nowMs = 0;
  return {
    context,
    master,
    graph,
    voice,
    noise,
    filter,
    gain,
    output,
    set(airspeedKmh: number, jump: readonly string[] = [], live = true) {
      voice.update({ airspeedKmh }, { nowMs, live, jump });
    },
    advance(ms: number) {
      nowMs += ms;
      context.currentTime = nowMs / 1000;
    },
  };
}

const glides = (param: FakeAudioParam) =>
  param.calls.filter(({ method }) => method === 'setTargetAtTime').map(({ args }) => args);

const gainFor = (kmh: number) => LEVEL * (kmh / REFERENCE_KMH) ** 2;
const cutoffFor = (kmh: number) => MIN_CUTOFF_HZ + CUTOFF_HZ_PER_REFERENCE * (kmh / REFERENCE_KMH);

describe('airflow voice', () => {
  it('is registered as airflow', () => {
    expect(voiceFactories.airflow).toBe(airflow);
  });

  it('feeds the shared noise through a low-pass and a gain to the master', () => {
    const { context, noise, filter, gain, master } = setup();
    expect(noise.loop).toBe(true);
    expect(noise.buffer).toBe(noiseBuffer(context.asAudioContext()));
    expect(noise.startedAt).toBeDefined();
    expect(filter.type).toBe('lowpass');
    expect(context.reaches(noise, filter)).toBe(true);
    expect(context.reaches(filter, gain)).toBe(true);
    expect(context.reaches(gain, master)).toBe(true);
  });

  it('is silent at rest, with the low-pass at its lowest cutoff', () => {
    const { gain, filter } = setup();
    expect(gain.gain.value).toBe(0);
    expect(filter.frequency.value).toBe(MIN_CUTOFF_HZ);
  });

  it('follows the square of airspeed over the reference, and the cutoff rises with it', () => {
    const { gain, filter, set } = setup();
    set(REFERENCE_KMH / 2);
    expect(gain.gain.value).toBeCloseTo(gainFor(REFERENCE_KMH / 2));
    expect(filter.frequency.value).toBeCloseTo(cutoffFor(REFERENCE_KMH / 2));
    set(REFERENCE_KMH);
    expect(gain.gain.value).toBeCloseTo(gainFor(REFERENCE_KMH));
    expect(gain.gain.value).toBeCloseTo(LEVEL);
    expect(filter.frequency.value).toBeGreaterThan(cutoffFor(REFERENCE_KMH / 2));
  });

  it('rises in level and cutoff with every faster reading up to the cap, by the square law', () => {
    const { gain, filter, set } = setup();
    let previous = { gain: gain.gain.value, cutoff: filter.frequency.value };
    for (const kmh of [25, 50, 100, 150, 200, 250, MAX_RATIO * REFERENCE_KMH]) {
      set(kmh);
      expect(gain.gain.value).toBeGreaterThan(previous.gain);
      expect(filter.frequency.value).toBeGreaterThan(previous.cutoff);
      previous = { gain: gain.gain.value, cutoff: filter.frequency.value };
    }
    set(50);
    const atFifty = gain.gain.value;
    set(150);
    expect(gain.gain.value / atFifty).toBeCloseTo(9);
    set(10 * REFERENCE_KMH);
    expect(filter.frequency.value).toBeLessThan(44_100 / 2);
  });

  it('caps the ratio so a reading far over the reference stays bounded', () => {
    const { gain, set } = setup();
    set(100 * REFERENCE_KMH);
    expect(gain.gain.value).toBeCloseTo(LEVEL * MAX_RATIO ** 2);
  });

  it('treats a negative or non-finite reading as 0', () => {
    for (const reading of [-50, Number.NaN, Number.POSITIVE_INFINITY]) {
      const { gain, set } = setup();
      set(REFERENCE_KMH);
      set(reading);
      expect(gain.gain.value).toBe(0);
    }
  });

  it('falls to 0 when the frame lacks airspeedKmh', () => {
    const { voice, gain, filter, set } = setup();
    set(REFERENCE_KMH);
    voice.update({}, { nowMs: 0, live: true, jump: [] });
    expect(gain.gain.value).toBe(0);
    expect(filter.frequency.value).toBe(MIN_CUTOFF_HZ);
  });

  it('glides to a step over the smoothing time constant', () => {
    const { gain, filter, set } = setup();
    set(REFERENCE_KMH);
    expect(glides(gain.gain)).toEqual([[gainFor(REFERENCE_KMH), 0, SMOOTHING_S]]);
    expect(glides(filter.frequency)).toEqual([[cutoffFor(REFERENCE_KMH), 0, SMOOTHING_S]]);
    expect(gain.gain.calls.some(({ method }) => method === 'setValueAtTime')).toBe(false);
  });

  it('schedules nothing while the reading holds', () => {
    const { gain, filter, set, advance } = setup();
    set(REFERENCE_KMH);
    const calls = gain.gain.calls.length + filter.frequency.calls.length;
    for (let step = 0; step < 10; step += 1) {
      advance(STEP_MS);
      set(REFERENCE_KMH);
    }
    expect(gain.gain.calls.length + filter.frequency.calls.length).toBe(calls);
  });

  it('glides to a jump over SMOOTHING_S in one call per parameter, with no hard step', () => {
    const { gain, filter, set, advance } = setup();
    set(REFERENCE_KMH);
    advance(STEP_MS);
    const expected = [
      [gain.gain, gainFor(REFERENCE_KMH / 4), gain.gain.calls.length],
      [filter.frequency, cutoffFor(REFERENCE_KMH / 4), filter.frequency.calls.length],
    ] as const;
    set(REFERENCE_KMH / 4, ['airspeedKmh']);
    for (const [param, target, calls] of expected) {
      expect(param.calls.slice(calls)).toEqual([
        { method: 'setTargetAtTime', args: [target, STEP_MS / 1000, SMOOTHING_S] },
      ]);
    }
  });

  it('jumps even to the value it already glides to', () => {
    const { gain, set } = setup();
    set(REFERENCE_KMH);
    const calls = gain.gain.calls.length;
    set(REFERENCE_KMH, ['airspeedKmh']);
    expect(gain.gain.calls.slice(calls)).toEqual([
      { method: 'setTargetAtTime', args: [LEVEL, 0, SMOOTHING_S] },
    ]);
  });

  it('ignores a jump that names another input', () => {
    const { gain, set } = setup();
    set(REFERENCE_KMH, ['rpm']);
    expect(gain.gain.calls.at(-1)?.method).toBe('setTargetAtTime');
  });

  it('issues nothing while not live, and a jump when live returns catches up', () => {
    const { gain, filter, set } = setup();
    const calls = gain.gain.calls.length + filter.frequency.calls.length;
    set(REFERENCE_KMH, [], false);
    expect(gain.gain.calls.length + filter.frequency.calls.length).toBe(calls);
    set(REFERENCE_KMH, ['airspeedKmh']);
    expect(gain.gain.value).toBeCloseTo(LEVEL);
  });

  it('fades out on stop, stops the noise and disconnects every node', () => {
    const { context, graph, noise, voice, master, gain, output, set, advance } = setup();
    set(REFERENCE_KMH);
    advance(STEP_MS);
    voice.stop();
    const now = STEP_MS / 1000;
    expect(output.gain.calls.slice(-2)).toEqual([
      { method: 'cancelScheduledValues', args: [now] },
      { method: 'setTargetAtTime', args: [0, now, FADE_TIME_CONSTANT_S] },
    ]);
    expect(noise.stoppedAt).toBeCloseTo(now + FADE_TIME_CONSTANT_S * TIME_CONSTANTS_TO_SILENCE);
    advance(1000);
    context.currentTime = noise.stoppedAt ?? 0;
    expect(noise.ended).toBe(true);
    for (const node of graph) expect(node.connections).toEqual([]);
    expect(context.liveNodes()).toEqual([master]);
    const calls = gain.gain.calls.length;
    set(REFERENCE_KMH / 2);
    expect(gain.gain.calls).toHaveLength(calls);
  });

  it('disconnects at once when stopped on a context that is not running', () => {
    const { context, graph, noise, voice } = setup();
    context.setState('suspended');
    voice.stop();
    expect(noise.stoppedAt).toBe(context.currentTime);
    for (const node of graph) expect(node.connections).toEqual([]);
  });

  it('stops only once', () => {
    const { noise, voice, advance } = setup();
    voice.stop();
    const stoppedAt = noise.stoppedAt;
    advance(100);
    voice.stop();
    expect(noise.stoppedAt).toBe(stoppedAt);
  });

  it('rejects a missing, out-of-range or unknown option, and create throws on them', () => {
    const [min, max] = REFERENCE_KMH_RANGE;
    for (const good of [min, REFERENCE_KMH, max]) {
      expect(airflowProblems({ referenceKmh: good })).toEqual([]);
    }
    expect(airflowProblems({})).toEqual(['missing option referenceKmh']);
    const bads = [0, -200, min * 0.99, max * 1.01, 1e9, Number.NaN, Number.POSITIVE_INFINITY];
    for (const bad of [...bads, '200', null]) {
      expect(airflowProblems({ referenceKmh: bad as number })).toEqual([
        'option referenceKmh is out of range',
      ]);
    }
    expect(airflowProblems({ ...OPTIONS, extra: 1 })).toEqual(['unknown option extra']);
    expect(airflowProblems({ extra: 1, referenceKmh: 0 })).toEqual([
      'unknown option extra',
      'option referenceKmh is out of range',
    ]);
    expect(airflowProblems({ extra: 1 })).toEqual([
      'unknown option extra',
      'missing option referenceKmh',
    ]);
    const context = new FakeAudioContext();
    expect(() => airflow.create(context.out(), {})).toThrow(/airflow: missing option/);
    expect(airflow.problems).toBe(airflowProblems);
  });

  it('leaves no node connected when the graph fails to build', () => {
    const context = new FakeAudioContext();
    context.createBiquadFilter = () => {
      throw new Error('no filter');
    };
    expect(() => airflow.create(context.out(), OPTIONS)).toThrow('no filter');
    expect(context.nodes.every((node) => node.connections.length === 0)).toBe(true);
  });
});

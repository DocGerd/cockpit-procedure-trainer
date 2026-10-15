import { STEP_MS } from '@cpt/core';
import type { JsonObject } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import {
  FakeAudioBufferSourceNode,
  FakeAudioContext,
  FakeAudioNode,
  FakeAudioParam,
  FakeBiquadFilterNode,
  FakeGainNode,
  FakeOscillatorNode,
} from '../fake-audio-context';
import type { FakeAutomation } from '../fake-audio-context';
import { voiceFactories } from '../voice-factories';
import { pistonEngine, SMOOTHING_S } from './piston-engine';
import { cycleHz, pistonEngineDefaults, pistonEngineProblems } from './piston-engine-model';

const OPTIONS = { cylinders: 4, idleRpm: 1400, maxContinuousRpm: 5500 } satisfies JsonObject;
const ALL = ['rpm', 'running', 'starter'] as const;
const SETTLE_MS = 20 * pistonEngineDefaults.runDownMs;
const CRANK_MS = 3 * pistonEngineDefaults.windMs;

type Inputs = { rpm: number; running: number; starter: number };
const PARKED: Inputs = { rpm: 0, running: 0, starter: 0 };
const IDLE: Inputs = { rpm: OPTIONS.idleRpm, running: 1, starter: 0 };

const paramsOf = (node: FakeAudioNode) =>
  Object.values(node).filter((value): value is FakeAudioParam => value instanceof FakeAudioParam);

const automationOf = (param: FakeAudioParam) =>
  param.calls.filter(({ method }) => method !== 'value');

const nodeAfter = (node: FakeAudioNode): FakeAudioNode => {
  const next = node.connections.map(({ target }) => target).find((t) => t instanceof FakeAudioNode);
  if (!next) throw new Error(`${node.kind} feeds no node`);
  return next;
};

const paramAfter = (node: FakeAudioNode): FakeAudioParam => {
  const next = node.connections
    .map(({ target }) => target)
    .find((t) => t instanceof FakeAudioParam);
  if (!next) throw new Error(`${node.kind} feeds no parameter`);
  return next;
};

const only = <T>(items: readonly T[], what: string): T => {
  const [item] = items;
  if (item === undefined || items.length > 1) throw new Error(`expected one ${what}`);
  return item;
};

function setup(context = new FakeAudioContext()) {
  context.setState('running');
  const master = context.createGain();
  master.connect(context.destination);
  const out = { context: context.asAudioContext(), input: master as unknown as AudioNode };
  const before = context.nodes.length;
  const voice = pistonEngine.create(out, OPTIONS);
  const graph = context.nodes.slice(before);

  const bus = only(context.nodesOf('constant-source'), 'bus');
  const driven = context
    .nodesOf('oscillator')
    .filter((oscillator) => bus.connections.some(({ target }) => target === oscillator.frequency));
  const terms = (oscillator: FakeOscillatorNode) => oscillator.periodicWave?.real.length ?? 0;
  const [firing, modulator] = [...driven].sort((a, b) => terms(b) - terms(a));
  const whine = only(
    context.nodesOf('oscillator').filter((oscillator) => !driven.includes(oscillator)),
    'whine',
  );
  if (!firing || !modulator) throw new Error('expected two oscillators on the bus');
  const firingFilter = nodeAfter(firing) as FakeBiquadFilterNode;
  const firingGain = nodeAfter(firingFilter) as FakeGainNode;
  const exhaustDepth = nodeAfter(modulator) as FakeGainNode;
  const exhaustGain = paramAfter(exhaustDepth).owner as FakeGainNode;
  const exhaustFilter = only(
    context
      .nodesOf('biquad-filter')
      .filter(({ connections }) => connections.some(({ target }) => target === exhaustGain)),
    'exhaust filter',
  );
  const whineGain = nodeAfter(whine) as FakeGainNode;
  const compression = only(
    context
      .nodesOf('gain')
      .filter(({ connections }) => connections.some(({ target }) => target === whineGain.gain)),
    'compression gain',
  );
  const output = only(
    graph.filter(({ connections }) => connections.some(({ target }) => target === master)),
    'output gain',
  ) as FakeGainNode;

  let nowMs = 0;
  let held: Inputs = PARKED;
  let live = true;
  const frame = (jump: readonly string[]) => voice.update(held, { nowMs, live, jump });
  const params = () => graph.flatMap(paramsOf);

  return {
    context,
    master,
    graph,
    voice,
    nodes: {
      bus,
      firing,
      modulator,
      whine,
      firingFilter,
      firingGain,
      exhaustFilter,
      exhaustGain,
      exhaustDepth,
      whineGain,
      compression,
      output,
    },
    set(change: Partial<Inputs>, jump: readonly string[] = []) {
      held = { ...held, ...change };
      frame(jump);
    },
    advance(ms: number) {
      for (let elapsed = 0; elapsed < ms; elapsed += STEP_MS) {
        nowMs += STEP_MS;
        context.currentTime = nowMs / 1000;
        frame([]);
      }
    },
    setLive(on: boolean) {
      live = on;
    },
    automation: (): FakeAutomation[] => params().flatMap(automationOf),
    clear() {
      for (const param of params()) param.calls.splice(0);
    },
  };
}

/** A cockpit loaded straight into `inputs`, as a phase load leaves it. */
const loaded = (inputs: Inputs) => {
  const engine = setup();
  engine.set(inputs, ALL);
  return engine;
};

describe('piston-engine voice', () => {
  it('registers as piston-engine and checks options with the model', () => {
    expect(voiceFactories['piston-engine']).toBe(pistonEngine);
    expect(pistonEngine.problems({})).toEqual(pistonEngineProblems({}));
    expect(pistonEngine.problems(OPTIONS)).toEqual([]);
    const context = new FakeAudioContext();
    expect(() => pistonEngine.create(context.out(), { cylinders: 4 })).toThrow(/missing option/);
  });

  it('connects every node it builds to the master gain', () => {
    const { context, master, graph } = setup();
    expect(graph.length).toBeGreaterThan(0);
    for (const node of graph) expect(context.reaches(node, master)).toBe(true);
    expect(context.calls).not.toContain('audioWorklet.addModule');
    expect(context.calls).not.toContain('createMediaElementSource');
  });

  it('drives oscillators of frequency 0 from the bus, with the energy on the firing order', () => {
    const { nodes } = setup();
    for (const oscillator of [nodes.firing, nodes.modulator]) {
      expect(oscillator.frequency.value).toBe(0);
      expect(oscillator.startedAt).toBeDefined();
      const real = oscillator.periodicWave?.real ?? [];
      const firingOrder = real[OPTIONS.cylinders] ?? 0;
      for (let order = 1; order < OPTIONS.cylinders; order += 1) {
        expect(real[order]).toBeGreaterThan(0);
        expect(real[order]).toBeLessThan(firingOrder);
      }
    }
  });

  it('adds low-passed noise to the bus for cycle-to-cycle variation', () => {
    const { context, nodes } = setup();
    const jitter = only(
      context
        .nodesOf('gain')
        .filter(({ connections }) => connections.some(({ target }) => target === nodes.bus.offset)),
      'jitter gain',
    );
    const [lowpass] = context
      .nodesOf('biquad-filter')
      .filter(({ connections }) => connections.some(({ target }) => target === jitter));
    expect(lowpass?.type).toBe('lowpass');
  });

  it('plays the exhaust as looping noise through a band-pass modulated on the bus', () => {
    const { context, nodes } = setup();
    expect(nodes.exhaustFilter.type).toBe('bandpass');
    const noise = only(context.nodesOf('buffer-source'), 'noise source');
    expect(noise.loop).toBe(true);
    expect(context.reaches(noise, nodes.exhaustFilter)).toBe(true);
    expect(nodes.exhaustDepth.connections.map(({ target }) => target)).toContain(
      nodes.exhaustGain.gain,
    );
  });

  it('holds the bus at rpm / 120', () => {
    const engine = loaded(IDLE);
    expect(engine.nodes.bus.offset.value).toBe(OPTIONS.idleRpm / 120);
    engine.set({ rpm: 5000 }, ['rpm']);
    expect(engine.nodes.bus.offset.value).toBe(cycleHz(5000));
    engine.set({ rpm: 4850 });
    engine.advance(SETTLE_MS);
    expect(engine.nodes.bus.offset.value).toBeCloseTo(4850 / 120, 3);
  });

  it('issues one setTargetAtTime per changed target, at currentTime with SMOOTHING_S', () => {
    const engine = loaded(IDLE);
    engine.advance(SETTLE_MS);
    engine.clear();
    engine.set({ rpm: 2500 });
    engine.advance(STEP_MS);
    const calls = engine.automation();
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call).toEqual({
        method: 'setTargetAtTime',
        args: [expect.any(Number), engine.context.currentTime, SMOOTHING_S],
      });
    }
    expect(SMOOTHING_S).toBe(STEP_MS / 3 / 1000);
    expect(automationOf(engine.nodes.bus.offset)).toHaveLength(1);
    for (const node of engine.graph) {
      for (const param of paramsOf(node)) expect(automationOf(param).length).toBeLessThanOrEqual(1);
    }
  });

  it('issues nothing while the inputs hold, also once a change has settled', () => {
    const changes: [Inputs, Partial<Inputs>][] = [
      [PARKED, {}],
      [IDLE, {}],
      [IDLE, { rpm: OPTIONS.maxContinuousRpm }],
      [IDLE, { running: 0, rpm: 0 }],
      [PARKED, { starter: 1 }],
    ];
    for (const [inputs, change] of changes) {
      const engine = loaded(inputs);
      engine.set(change);
      engine.advance(SETTLE_MS);
      engine.clear();
      engine.advance(SETTLE_MS);
      expect(engine.automation()).toEqual([]);
    }
  });

  it('issues nothing while not live, then one target per moved parameter on the jump', () => {
    const engine = loaded(IDLE);
    engine.advance(SETTLE_MS);
    engine.clear();
    engine.setLive(false);
    engine.set({ rpm: 4000 });
    engine.advance(SETTLE_MS);
    engine.set({ starter: 1 });
    engine.advance(CRANK_MS);
    expect(engine.automation()).toEqual([]);

    engine.setLive(true);
    engine.set({ starter: 0 }, ALL);
    expect(automationOf(engine.nodes.bus.offset)).toEqual([
      {
        method: 'setTargetAtTime',
        args: [cycleHz(4000), engine.context.currentTime, SMOOTHING_S],
      },
    ]);
    for (const node of engine.graph) {
      for (const param of paramsOf(node)) expect(automationOf(param).length).toBeLessThanOrEqual(1);
    }
    expect(engine.automation().length).toBeGreaterThan(1);
  });

  it('cranks with the whine and compression pulses at the cranking rpm, without combustion', () => {
    const engine = loaded(PARKED);
    engine.set({ starter: 1 });
    engine.advance(CRANK_MS);
    const { nodes } = engine;
    expect(nodes.bus.offset.value).toBeCloseTo(cycleHz(pistonEngineDefaults.crankingRpm), 0);
    expect(nodes.firingGain.gain.value).toBe(0);
    expect(nodes.whineGain.gain.value).toBeGreaterThan(0);
    expect(nodes.compression.gain.value).toBeGreaterThan(0);
    expect(nodes.exhaustGain.gain.value).toBeGreaterThan(0);
    expect(nodes.exhaustDepth.gain.value).toBeCloseTo(nodes.exhaustGain.gain.value, 6);
  });

  it('catches into firing, and the whine and compression pulses go once the key is released', () => {
    const engine = loaded(PARKED);
    engine.set({ starter: 1 });
    engine.advance(CRANK_MS);
    const crankingWhine = engine.nodes.whine.frequency.value;
    engine.set({ running: 1, rpm: OPTIONS.idleRpm });
    engine.advance(STEP_MS);
    expect(engine.nodes.firingGain.gain.value).toBeGreaterThan(0);
    engine.set({ starter: 0 });
    engine.advance(SETTLE_MS);
    const { nodes } = engine;
    expect(nodes.bus.offset.value).toBeCloseTo(cycleHz(OPTIONS.idleRpm), 3);
    expect(nodes.whineGain.gain.value).toBeLessThan(1e-3);
    expect(nodes.compression.gain.value).toBeLessThan(1e-3);
    expect(nodes.whine.frequency.value).toBeLessThan(crankingWhine);
  });

  it('is louder, brighter and pulses less at full power than at idle', () => {
    const idle = loaded(IDLE).nodes;
    const full = loaded({ rpm: OPTIONS.maxContinuousRpm, running: 1, starter: 0 }).nodes;
    const rpmRatio = OPTIONS.maxContinuousRpm / OPTIONS.idleRpm;
    expect(full.firingGain.gain.value).toBeGreaterThan(idle.firingGain.gain.value);
    expect(full.firingFilter.frequency.value / idle.firingFilter.frequency.value).toBeGreaterThan(
      rpmRatio,
    );
    expect(full.exhaustFilter.frequency.value / idle.exhaustFilter.frequency.value).toBeCloseTo(
      rpmRatio,
      6,
    );
    const depth = (nodes: typeof idle) =>
      nodes.exhaustDepth.gain.value / nodes.exhaustGain.gain.value;
    expect(depth(full)).toBeLessThan(depth(idle));
  });

  it('scales the level by rpm / idle below idle', () => {
    const idle = loaded(IDLE).nodes.firingGain.gain.value;
    const half = loaded({ rpm: OPTIONS.idleRpm / 2, running: 1, starter: 0 }).nodes.firingGain.gain
      .value;
    expect(half).toBeCloseTo(idle / 2, 6);
  });

  it('windmills without firing: swish at the rpm the airflow turns', () => {
    const engine = loaded({ rpm: 5000, running: 1, starter: 0 });
    engine.set({ running: 0, rpm: 1000 });
    engine.advance(SETTLE_MS);
    const { nodes } = engine;
    expect(nodes.firingGain.gain.value).toBe(0);
    expect(nodes.bus.offset.value).toBeCloseTo(cycleHz(1000), 3);
    expect(nodes.exhaustGain.gain.value).toBeGreaterThan(0);
  });

  it('runs down to silence on shutdown', () => {
    const engine = loaded(IDLE);
    engine.set({ running: 0, rpm: 0 });
    engine.advance(STEP_MS);
    expect(engine.nodes.firingGain.gain.value).toBeLessThan(1e-3);
    expect(engine.nodes.bus.offset.value).toBeGreaterThan(cycleHz(OPTIONS.idleRpm) / 2);
    engine.advance(SETTLE_MS);
    for (const gain of [engine.nodes.exhaustGain, engine.nodes.whineGain]) {
      expect(gain.gain.value).toBeLessThan(1e-3);
    }
  });

  it('reads missing or invalid inputs as 0', () => {
    const engine = loaded(IDLE);
    engine.voice.update({}, { nowMs: 0, live: true, jump: ALL });
    expect(engine.nodes.bus.offset.value).toBe(0);
    engine.voice.update(
      { rpm: Number.NaN, running: -1, starter: Number.POSITIVE_INFINITY },
      { nowMs: 0, live: true, jump: ALL },
    );
    expect(engine.nodes.bus.offset.value).toBe(0);
    expect(engine.nodes.whineGain.gain.value).toBe(0);
  });

  it('builds no node after create, so live nodes stay bounded over a start, a run and a shutdown', () => {
    const engine = loaded(PARKED);
    const created = engine.context.nodes.length;
    const live = engine.context.liveNodes().length;
    engine.set({ starter: 1 });
    engine.advance(CRANK_MS);
    engine.set({ running: 1, rpm: OPTIONS.idleRpm });
    engine.advance(STEP_MS);
    engine.set({ starter: 0 });
    for (const rpm of [OPTIONS.maxContinuousRpm, OPTIONS.idleRpm - 100, OPTIONS.idleRpm]) {
      engine.set({ rpm });
      engine.advance(SETTLE_MS / 4);
    }
    engine.set({ running: 0, rpm: 0 });
    engine.advance(SETTLE_MS);
    expect(engine.context.nodes).toHaveLength(created);
    expect(engine.context.liveNodes()).toHaveLength(live);
  });

  it('fades out on stop, then stops every source and disconnects every node', () => {
    const engine = loaded(IDLE);
    engine.advance(STEP_MS);
    const { context, master, nodes } = engine;
    const now = context.currentTime;
    engine.clear();
    engine.voice.stop();
    expect(automationOf(nodes.output.gain)).toEqual([
      { method: 'cancelScheduledValues', args: [now] },
      { method: 'setTargetAtTime', args: [0, now, expect.any(Number)] },
    ]);
    const sources = engine.graph.filter(
      (node): node is FakeOscillatorNode | FakeAudioBufferSourceNode =>
        node instanceof FakeOscillatorNode || node instanceof FakeAudioBufferSourceNode,
    );
    const stops = new Set(sources.map(({ stoppedAt }) => stoppedAt));
    expect(stops.size).toBe(1);
    const [end] = stops;
    expect(end).toBeGreaterThan(now);
    expect(nodes.bus.stoppedAt).toBe(end);
    expect(context.liveNodes()).toContain(nodes.output);

    context.currentTime = end ?? 0;
    expect(context.liveNodes()).toEqual([master]);
    engine.clear();
    engine.advance(SETTLE_MS);
    engine.voice.stop();
    expect(engine.automation()).toEqual([]);
  });

  it('disconnects at once when stopped on a context that is not running', async () => {
    const engine = loaded(IDLE);
    engine.context.setState('suspended');
    engine.voice.stop();
    for (const node of engine.graph) expect(node.connections).toEqual([]);
    expect(engine.nodes.bus.stoppedAt).toBe(engine.context.currentTime);
    await Promise.resolve();
    expect(engine.context.liveNodes()).toEqual([engine.master]);
  });

  it('shares one looping noise buffer between the voices on a context', () => {
    const context = new FakeAudioContext();
    setup(context);
    pistonEngine.create(context.out(), OPTIONS);
    const [first, second] = context.nodesOf('buffer-source');
    expect(first?.buffer).toBeDefined();
    expect(second?.buffer).toBe(first?.buffer);
    const samples = first?.buffer?.getChannelData(0) ?? new Float32Array();
    expect(samples.length).toBeGreaterThan(0);
    expect(samples.some((sample) => sample !== 0)).toBe(true);
    expect(samples.every((sample) => sample >= -1 && sample <= 1)).toBe(true);

    const other = new FakeAudioContext();
    pistonEngine.create(other.out(), OPTIONS);
    expect(only(other.nodesOf('buffer-source'), 'noise').buffer).not.toBe(first?.buffer);
  });
});

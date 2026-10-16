import { STEP_MS } from '@cpt/core';
import type { JsonObject } from '@cpt/core';
import { describe, expect, it, vi } from 'vitest';
import {
  FakeAudioBuffer,
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
import { NOISE_RMS } from './noise';
import { pistonEngine, SMOOTHING_S } from './piston-engine';
import { bladePassHz, pistonEngineDefaults, pistonEngineProblems } from './piston-engine-model';

const OPTIONS = { cylinders: 4, idleRpm: 1400, maxContinuousRpm: 5500 } satisfies JsonObject;
const ALL = ['rpm', 'running', 'starter'] as const;
const SETTLE_MS = 20 * pistonEngineDefaults.runDownMs;
const CRANK_MS = 3 * pistonEngineDefaults.windMs;
const PITCH_TOLERANCE = 2e-3;

type Inputs = { rpm: number; running: number; starter: number };
const PARKED: Inputs = { rpm: 0, running: 0, starter: 0 };
const IDLE: Inputs = { rpm: OPTIONS.idleRpm, running: 1, starter: 0 };
const FULL: Inputs = { rpm: OPTIONS.maxContinuousRpm, running: 1, starter: 0 };

const paramsOf = (node: FakeAudioNode) =>
  Object.values(node).filter((value): value is FakeAudioParam => value instanceof FakeAudioParam);

const automationOf = (param: FakeAudioParam) =>
  param.calls.filter(({ method }) => method !== 'value');

const targetsOf = (node: FakeAudioNode) => node.connections.map(({ target }) => target);

const feeds = (node: FakeAudioNode, target: FakeAudioNode | FakeAudioParam) =>
  targetsOf(node).includes(target);

const feedsKind = (node: FakeAudioNode, kind: FakeAudioNode['kind']) =>
  targetsOf(node).some((target) => target instanceof FakeAudioNode && target.kind === kind);

const nodeAfter = (node: FakeAudioNode): FakeAudioNode => {
  const next = targetsOf(node).find((target) => target instanceof FakeAudioNode);
  if (!next) throw new Error(`${node.kind} feeds no node`);
  return next;
};

const paramAfter = (node: FakeAudioNode): FakeAudioParam => {
  const next = targetsOf(node).find((target) => target instanceof FakeAudioParam);
  if (!next) throw new Error(`${node.kind} feeds no parameter`);
  return next;
};

const only = <T>(items: readonly T[], what: string): T => {
  const [item] = items;
  if (item === undefined || items.length > 1) throw new Error(`expected one ${what}`);
  return item;
};

const waveOf = (oscillator: FakeOscillatorNode) => {
  if (!oscillator.periodicWave) throw new Error('expected a periodic wave');
  return oscillator.periodicWave;
};

const expectPitch = (hz: number, expected: number) =>
  expect(Math.abs(hz / expected - 1)).toBeLessThan(PITCH_TOLERANCE);

function mastered(context: FakeAudioContext) {
  context.setState('running');
  const master = context.createGain();
  master.connect(context.destination);
  return {
    master,
    out: { context: context.asAudioContext(), input: master as unknown as AudioNode },
  };
}

function setup(context = new FakeAudioContext(), options: JsonObject = OPTIONS) {
  const { master, out } = mastered(context);
  const before = context.nodes.length;
  const voice = pistonEngine.create(out, options);
  const graph = context.nodes.slice(before);

  const bus = only(context.nodesOf('constant-source'), 'bus');
  const driven = context
    .nodesOf('oscillator')
    .filter((oscillator) => feeds(bus, oscillator.frequency));
  const firing = only(
    driven.filter((oscillator) => feedsKind(oscillator, 'biquad-filter')),
    'firing oscillator',
  );
  const modulator = only(
    driven.filter((oscillator) => feedsKind(oscillator, 'gain')),
    'modulator',
  );
  const scaled = context
    .nodesOf('gain')
    .filter((gain) => feeds(bus, gain))
    .flatMap((gain) => context.nodesOf('oscillator').filter((each) => feeds(gain, each.frequency)));
  const whine = only(
    context
      .nodesOf('oscillator')
      .filter((oscillator) => !driven.includes(oscillator) && !scaled.includes(oscillator)),
    'whine',
  );
  const firingFilter = nodeAfter(firing) as FakeBiquadFilterNode;
  const firingGain = nodeAfter(firingFilter) as FakeGainNode;
  const whineGain = nodeAfter(whine) as FakeGainNode;
  const compression = only(
    context.nodesOf('gain').filter((gain) => feeds(gain, whineGain.gain)),
    'compression gain',
  );
  const exhaustDepth = only(
    targetsOf(modulator).filter(
      (target): target is FakeGainNode => target instanceof FakeGainNode && target !== compression,
    ),
    'exhaust depth',
  );
  const exhaustGain = paramAfter(exhaustDepth).owner as FakeGainNode;
  const exhaustFilter = only(
    context.nodesOf('biquad-filter').filter((filter) => feeds(filter, exhaustGain)),
    'exhaust filter',
  );
  const jitter = only(
    context.nodesOf('gain').filter((gain) => feeds(gain, bus.offset)),
    'jitter gain',
  );
  const jitterFilter = only(
    context.nodesOf('biquad-filter').filter((filter) => feeds(filter, jitter)),
    'jitter filter',
  );
  const noise = only(context.nodesOf('buffer-source'), 'noise source');
  const output = only(
    graph.filter((node) => feeds(node, master)),
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
      jitter,
      jitterFilter,
      noise,
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

  it.each(['createPeriodicWave', 'createBuffer'] as const)(
    'leaves nothing connected when %s throws during create',
    (method) => {
      const context = new FakeAudioContext();
      const { master, out } = mastered(context);
      const failing = () => {
        throw new DOMException('The wave is not supported.', 'NotSupportedError');
      };
      if (method === 'createBuffer') vi.spyOn(context, method).mockImplementationOnce(failing);
      else vi.spyOn(context, method).mockImplementationOnce(failing);
      expect(() => pistonEngine.create(out, OPTIONS)).toThrow('The wave is not supported.');
      expect(context.liveNodes()).toEqual([master]);

      pistonEngine.create(out, OPTIONS);
      const noise = context.nodesOf('buffer-source').at(-1);
      expect(noise?.buffer).toBeInstanceOf(FakeAudioBuffer);
      expect(noise && context.reaches(noise, master)).toBe(true);
    },
  );

  it('drives oscillators of frequency 0 from the bus, with the energy on the firing order', () => {
    const { nodes } = setup();
    for (const oscillator of [nodes.firing, nodes.modulator]) {
      expect(oscillator.frequency.value).toBe(0);
      expect(oscillator.startedAt).toBeDefined();
      const { real } = waveOf(oscillator);
      const firingOrder = real[OPTIONS.cylinders] ?? 0;
      for (let order = 1; order < OPTIONS.cylinders; order += 1) {
        expect(real[order]).toBeGreaterThan(0);
        expect(real[order]).toBeLessThan(firingOrder);
      }
    }
  });

  it('builds the pulse waves from cosine terms that roll off between and above the firing orders', () => {
    const { nodes } = setup();
    const cylinders = OPTIONS.cylinders;
    for (const oscillator of [nodes.firing, nodes.modulator]) {
      const { real, imag } = waveOf(oscillator);
      expect(real[0]).toBe(0);
      expect(imag.every((term) => term === 0)).toBe(true);
      const at = (order: number) => real[order] ?? 0;
      for (let order = 1; order < real.length; order += 1) {
        expect(at(order)).toBeGreaterThan(0);
        const lower = order - (order % cylinders);
        if (order % cylinders === 0) {
          if (order > cylinders) expect(at(order)).toBeLessThan(at(order - cylinders));
          continue;
        }
        if (lower > 0) expect(at(order)).toBeLessThan(at(lower));
        if (lower + cylinders < real.length) expect(at(order)).toBeLessThan(at(lower + cylinders));
      }
    }
  });

  it('plays the starter whine on sine terms with falling harmonics', () => {
    const { real, imag } = waveOf(setup().nodes.whine);
    expect(real.every((term) => term === 0)).toBe(true);
    expect(imag[0]).toBe(0);
    expect(imag[1]).toBeGreaterThan(0);
    for (let harmonic = 2; harmonic < imag.length; harmonic += 1) {
      expect(imag[harmonic]).toBeLessThan(imag[harmonic - 1] ?? 0);
    }
  });

  it('reads the cylinder count: the firing order and the exhaust band follow it', () => {
    const rpm = 3000;
    const ratios = [2, 4, 6].map((cylinders) => {
      const engine = setup(new FakeAudioContext(), { ...OPTIONS, cylinders });
      for (const oscillator of [engine.nodes.firing, engine.nodes.modulator]) {
        const { real } = waveOf(oscillator);
        expect(real.indexOf(Math.max(...real))).toBe(cylinders);
      }
      engine.set({ rpm, running: 1, starter: 0 }, ALL);
      return engine.nodes.exhaustFilter.frequency.value / (((rpm / 60) * cylinders) / 2);
    });
    for (const ratio of ratios) expect(ratio).toBeCloseTo(ratios[0] ?? 0, 9);
  });

  it('adds low-passed noise to the bus in proportion to it, for cycle-to-cycle variation', () => {
    const { nodes } = setup();
    expect(nodes.jitterFilter.type).toBe('lowpass');
    expect(nodes.jitterFilter.frequency.value).toBeLessThan(20);
    expect(targetsOf(nodes.noise)).toContain(nodes.jitterFilter);
    expect(nodes.jitter.gain.value).toBe(0);

    const share = (engine: ReturnType<typeof setup>) => {
      const { jitter, jitterFilter, bus } = engine.nodes;
      const below = Math.sqrt((2 * jitterFilter.frequency.value) / engine.context.sampleRate);
      return (jitter.gain.value * NOISE_RMS * below) / bus.offset.value;
    };
    const idle = share(loaded(IDLE));
    expect(idle).toBeGreaterThan(1e-3);
    expect(idle).toBeLessThan(2e-2);
    expect(share(loaded(FULL))).toBeCloseTo(idle, 9);
  });

  it('plays the exhaust as looping noise through a band-pass modulated on the bus', () => {
    const { context, nodes } = setup();
    expect(nodes.exhaustFilter.type).toBe('bandpass');
    expect(nodes.noise.loop).toBe(true);
    expect(context.reaches(nodes.noise, nodes.exhaustFilter)).toBe(true);
    expect(targetsOf(nodes.exhaustDepth)).toContain(nodes.exhaustGain.gain);
  });

  it('holds the bus at rpm / 120', () => {
    const engine = loaded(IDLE);
    expect(engine.nodes.bus.offset.value).toBeCloseTo(1400 / 120, 9);
    engine.set({ rpm: 5000 }, ['rpm']);
    expect(engine.nodes.bus.offset.value).toBeCloseTo(5000 / 120, 9);
    engine.set({ rpm: 4850 });
    engine.advance(SETTLE_MS);
    expectPitch(engine.nodes.bus.offset.value, 4850 / 120);
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

  it('stops scheduling within a dozen time constants of a throttle change', () => {
    const changes: [Inputs, Inputs, number][] = [
      [IDLE, FULL, pistonEngineDefaults.throttleUpMs],
      [FULL, IDLE, pistonEngineDefaults.throttleDownMs],
    ];
    for (const [from, to, timeConstantMs] of changes) {
      const engine = loaded(from);
      engine.set(to);
      engine.advance(12 * timeConstantMs);
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
        args: [expect.closeTo(4000 / 120, 9), engine.context.currentTime, SMOOTHING_S],
      },
    ]);
    for (const node of engine.graph) {
      for (const param of paramsOf(node)) expect(automationOf(param).length).toBeLessThanOrEqual(1);
    }
    expect(engine.automation().length).toBeGreaterThan(1);
  });

  it('issues one target per moved parameter when it goes live again on an ordinary frame', () => {
    const engine = loaded(IDLE);
    engine.advance(SETTLE_MS);
    engine.clear();
    engine.setLive(false);
    engine.set({ rpm: 4000 });
    engine.advance(SETTLE_MS);
    expect(engine.automation()).toEqual([]);

    engine.setLive(true);
    engine.advance(STEP_MS);
    expect(automationOf(engine.nodes.bus.offset)).toEqual([
      {
        method: 'setTargetAtTime',
        args: [expect.closeTo(4000 / 120, 3), engine.context.currentTime, SMOOTHING_S],
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
    expect(nodes.bus.offset.value).toBeCloseTo(pistonEngineDefaults.crankingRpm / 120, 0);
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
    expectPitch(nodes.bus.offset.value, 1400 / 120);
    expect(nodes.whineGain.gain.value).toBeLessThan(1e-3);
    expect(nodes.compression.gain.value).toBeLessThan(1e-3);
    expect(nodes.whine.frequency.value).toBeLessThan(crankingWhine);
  });

  it('keeps the whine but drops the compression pulses while the key is held through the catch', () => {
    const engine = loaded(PARKED);
    engine.set({ starter: 1 });
    engine.advance(CRANK_MS);
    const cranking = engine.nodes.compression.gain.value;
    engine.set({ running: 1, rpm: OPTIONS.idleRpm });
    engine.advance(SETTLE_MS);
    const { nodes } = engine;
    expectPitch(nodes.bus.offset.value, 1400 / 120);
    expect(nodes.firingGain.gain.value).toBeGreaterThan(0);
    expect(nodes.whineGain.gain.value).toBeGreaterThan(0);
    expect(nodes.compression.gain.value).toBeLessThan(cranking / 100);
  });

  it('adds only the whine when the key is turned to START at idle', () => {
    const engine = loaded(IDLE);
    const { nodes } = engine;
    const firing = nodes.firingGain.gain.value;
    engine.set({ starter: 1 });
    engine.advance(CRANK_MS);
    expect(nodes.bus.offset.value).toBeCloseTo(1400 / 120, 9);
    expect(nodes.firingGain.gain.value).toBe(firing);
    expect(nodes.whineGain.gain.value).toBeGreaterThan(0);
    expect(nodes.compression.gain.value).toBe(0);
  });

  it('is louder, brighter and pulses less at full power than at idle', () => {
    const idle = loaded(IDLE).nodes;
    const full = loaded(FULL).nodes;
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
    expectPitch(nodes.bus.offset.value, 1000 / 120);
    expect(nodes.exhaustGain.gain.value).toBeGreaterThan(0);
  });

  it('runs down to silence on shutdown', () => {
    const engine = loaded(IDLE);
    engine.set({ running: 0, rpm: 0 });
    engine.advance(STEP_MS);
    expect(engine.nodes.firingGain.gain.value).toBeLessThan(1e-3);
    expect(engine.nodes.bus.offset.value).toBeGreaterThan(1400 / 120 / 2);
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

  it('returns to the master alone over repeated creates and stops, building one noise buffer', () => {
    const context = new FakeAudioContext();
    const { master, out } = mastered(context);
    const sizes = new Set<number>();
    for (let cycle = 0; cycle < 5; cycle += 1) {
      const before = context.nodes.length;
      const voice = pistonEngine.create(out, OPTIONS);
      sizes.add(context.nodes.length - before);
      // The first voice stops before its first frame.
      for (let frame = 0; frame < cycle * 20; frame += 1) {
        voice.update(cycle % 2 === 0 ? FULL : IDLE, {
          nowMs: frame * STEP_MS,
          live: true,
          jump: frame === 0 ? ALL : [],
        });
      }
      voice.stop();
      context.currentTime = context.nodesOf('constant-source').at(-1)?.stoppedAt ?? 0;
      expect(context.liveNodes()).toEqual([master]);
    }
    expect(sizes.size).toBe(1);
    expect(context.calls.filter((call) => call === 'createBuffer')).toHaveLength(1);
  });

  it('fades out on stop, then stops every source and disconnects every node', () => {
    const engine = loaded(IDLE);
    engine.advance(STEP_MS);
    const { context, master, nodes } = engine;
    const now = context.currentTime;
    engine.clear();
    engine.voice.stop();
    const fade = automationOf(nodes.output.gain);
    expect(fade).toEqual([
      { method: 'cancelScheduledValues', args: [now] },
      { method: 'setTargetAtTime', args: [0, now, expect.any(Number)] },
    ]);
    const sources = engine.graph.filter(
      (node): node is FakeOscillatorNode | FakeAudioBufferSourceNode =>
        node instanceof FakeOscillatorNode || node instanceof FakeAudioBufferSourceNode,
    );
    const stops = new Set(sources.map(({ stoppedAt }) => stoppedAt));
    expect(stops.size).toBe(1);
    const [end = 0] = stops;
    expect(end).toBeGreaterThan(now);
    expect(nodes.bus.stoppedAt).toBe(end);
    // The sources stop once the fade has left the voice far below hearing.
    const timeConstant = Number(fade[1]?.args[2]);
    expect(Math.exp(-(end - now) / timeConstant)).toBeLessThan(1e-4);
    expect(context.liveNodes()).toContain(nodes.output);

    context.currentTime = end;
    expect(context.liveNodes()).toEqual([master]);
    for (const node of engine.graph) expect(node.connections).toEqual([]);
    engine.clear();
    engine.advance(SETTLE_MS);
    engine.voice.stop();
    expect(engine.automation()).toEqual([]);
    expect(sources.map(({ stoppedAt }) => stoppedAt)).toEqual(sources.map(() => end));
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

  it('shares one long looping noise buffer between the voices on a context', () => {
    const context = new FakeAudioContext();
    setup(context);
    pistonEngine.create(context.out(), OPTIONS);
    const [first, second] = context.nodesOf('buffer-source');
    const buffer = first?.buffer;
    expect(buffer).toBeInstanceOf(FakeAudioBuffer);
    expect(second?.buffer).toBe(buffer);
    expect(buffer?.numberOfChannels).toBe(1);
    expect(buffer?.duration).toBeGreaterThanOrEqual(8);
    const samples = buffer?.getChannelData(0) ?? new Float32Array();
    expect(samples.every((sample) => sample >= -1 && sample <= 1)).toBe(true);
    const rms = Math.sqrt(
      samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length,
    );
    expect(Math.abs(rms / NOISE_RMS - 1)).toBeLessThan(0.02);

    const other = new FakeAudioContext();
    pistonEngine.create(other.out(), OPTIONS);
    expect(only(other.nodesOf('buffer-source'), 'noise').buffer).not.toBe(buffer);
  });
});

describe('piston-engine voice: blade-pass tone', () => {
  const FACTS = { gearboxRatio: 2.273, bladeCount: 3 } satisfies JsonObject;
  const WITH_FACTS = { ...OPTIONS, ...FACTS };

  const kindsOf = (engine: ReturnType<typeof setup>) => engine.graph.map((node) => node.kind);

  /** The blade-pass oscillator: the one whose frequency is fed by a gain that the bus feeds. */
  const bladeOf = (engine: ReturnType<typeof setup>) => {
    const { bus } = engine.nodes;
    const scale = only(
      engine.context.nodesOf('gain').filter((gain) => feeds(bus, gain)),
      'blade-pass scale',
    );
    const oscillator = only(
      engine.context.nodesOf('oscillator').filter((each) => feeds(scale, each.frequency)),
      'blade-pass oscillator',
    );
    const level = nodeAfter(oscillator) as FakeGainNode;
    return { scale, oscillator, level };
  };

  const toneHz = (engine: ReturnType<typeof setup>) => {
    const { scale } = bladeOf(engine);
    return engine.nodes.bus.offset.value * scale.gain.value;
  };

  it('builds nothing extra without both options, so existing aircraft keep their graph', () => {
    const plain = setup();
    for (const options of [
      { ...OPTIONS, gearboxRatio: 2.273 },
      { ...OPTIONS, bladeCount: 3 },
    ]) {
      const engine = setup(new FakeAudioContext(), options);
      expect(kindsOf(engine)).toEqual(kindsOf(plain));
      expect(engine.context.nodesOf('oscillator')).toHaveLength(3);
    }
    const scenario = (engine: ReturnType<typeof setup>) => {
      engine.set(IDLE, ALL);
      engine.advance(SETTLE_MS);
      engine.set(FULL);
      engine.advance(SETTLE_MS);
      engine.set({ starter: 1, running: 0, rpm: 0 });
      engine.advance(CRANK_MS);
      return engine.automation();
    };
    const plainAutomation = scenario(setup());
    expect(plainAutomation.length).toBeGreaterThan(0);
    for (const options of [
      { ...OPTIONS, gearboxRatio: 2.273 },
      { ...OPTIONS, bladeCount: 3 },
    ]) {
      expect(scenario(setup(new FakeAudioContext(), options))).toEqual(plainAutomation);
    }
  });

  it('adds one oscillator on the bus through a scaling gain, and a level gain to the output', () => {
    const plain = setup();
    const engine = setup(new FakeAudioContext(), WITH_FACTS);
    expect(engine.graph).toHaveLength(plain.graph.length + 3);
    const { scale, oscillator, level } = bladeOf(engine);
    expect(oscillator.frequency.value).toBe(0);
    expect(oscillator.startedAt).toBeDefined();
    expect(scale.gain.value).toBeCloseTo((2 * FACTS.bladeCount) / FACTS.gearboxRatio, 9);
    expect(engine.context.reaches(oscillator, engine.master)).toBe(true);
    for (const node of engine.graph) expect(engine.context.reaches(node, engine.master)).toBe(true);
    expect(level.gain.value).toBe(0);
  });

  it('plays the tone on sine terms with falling harmonics', () => {
    const { real, imag } = waveOf(bladeOf(setup(new FakeAudioContext(), WITH_FACTS)).oscillator);
    expect(real.every((term) => term === 0)).toBe(true);
    expect(imag[0]).toBe(0);
    expect(imag[1]).toBeGreaterThan(0);
    for (let harmonic = 2; harmonic < imag.length; harmonic += 1) {
      expect(imag[harmonic]).toBeLessThan(imag[harmonic - 1] ?? 0);
    }
  });

  it('holds the tone at rpm / ratio / 60 x blades, with the ratio and blade count read', () => {
    for (const facts of [
      FACTS,
      { gearboxRatio: 2.43, bladeCount: 2 },
      { gearboxRatio: 1, bladeCount: 5 },
    ]) {
      const engine = setup(new FakeAudioContext(), { ...OPTIONS, ...facts });
      engine.set(IDLE, ALL);
      expectPitch(toneHz(engine), bladePassHz(IDLE.rpm, facts.gearboxRatio, facts.bladeCount));
      engine.set({ rpm: 5000 }, ['rpm']);
      expectPitch(toneHz(engine), bladePassHz(5000, facts.gearboxRatio, facts.bladeCount));
      engine.set({ rpm: 4850 });
      engine.advance(SETTLE_MS);
      expectPitch(toneHz(engine), bladePassHz(4850, facts.gearboxRatio, facts.bladeCount));
    }
  });

  it('is silent parked, quieter at idle than at full power, and scales with rpm / idle below idle', () => {
    const engine = setup(new FakeAudioContext(), WITH_FACTS);
    const { level } = bladeOf(engine);
    expect(level.gain.value).toBe(0);
    engine.set(IDLE, ALL);
    const idle = level.gain.value;
    expect(idle).toBeGreaterThan(0);
    engine.set({ rpm: OPTIONS.maxContinuousRpm }, ['rpm']);
    expect(level.gain.value).toBeGreaterThan(idle);
    engine.set({ rpm: OPTIONS.idleRpm / 2 }, ['rpm']);
    expect(level.gain.value).toBeCloseTo(idle / 2, 6);
  });

  it('stays quiet but audible while the starter or the wind turns the propeller without firing', () => {
    const engine = setup(new FakeAudioContext(), WITH_FACTS);
    const { level } = bladeOf(engine);
    engine.set(IDLE, ALL);
    const idle = level.gain.value;
    for (const turning of [
      { starter: 1, running: 0, rpm: pistonEngineDefaults.crankingRpm },
      { starter: 0, running: 0, rpm: pistonEngineDefaults.crankingRpm },
    ]) {
      engine.set(turning);
      engine.advance(CRANK_MS);
      expect(level.gain.value).toBeGreaterThan(0);
      expect(level.gain.value).toBeLessThan(idle);
    }
  });

  it('issues nothing once settled, and stops and disconnects the extra nodes with the rest', () => {
    const withFacts = setup(new FakeAudioContext(), WITH_FACTS);
    withFacts.set(IDLE, ALL);
    withFacts.set(FULL);
    withFacts.advance(SETTLE_MS);
    withFacts.clear();
    withFacts.advance(SETTLE_MS);
    expect(withFacts.automation()).toEqual([]);

    withFacts.voice.stop();
    const { oscillator } = bladeOf(withFacts);
    expect(oscillator.stoppedAt).toBe(withFacts.nodes.bus.stoppedAt);
    withFacts.context.currentTime = withFacts.nodes.bus.stoppedAt ?? 0;
    expect(withFacts.context.liveNodes()).toEqual([withFacts.master]);
    for (const node of withFacts.graph) expect(node.connections).toEqual([]);
  });
});

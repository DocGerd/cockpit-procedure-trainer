import { describe, expect, it, vi } from 'vitest';
import { FakeAudioContext, FakeAudioParam } from './fake-audio-context';

const flush = async () => {
  for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
};

const errorName = (action: () => unknown) => {
  try {
    action();
  } catch (error) {
    return (error as Error).name;
  }
  return undefined;
};

describe('FakeAudioContext state', () => {
  it('starts suspended and runs once a microtask has passed', async () => {
    const context = new FakeAudioContext();
    const onstatechange = vi.fn();
    const listener = vi.fn();
    context.onstatechange = onstatechange;
    context.addEventListener('statechange', listener);

    expect(context.state).toBe('suspended');
    await flush();

    expect(context.state).toBe('running');
    expect(onstatechange).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('holds a refused resume pending until a resume is allowed, then settles every one', async () => {
    const context = new FakeAudioContext({ allowStart: false });
    const first = vi.fn();
    void context.resume().then(first);
    await flush();

    expect(context.state).toBe('suspended');
    expect(first).not.toHaveBeenCalled();

    context.allowStart = true;
    const second = vi.fn();
    void context.resume().then(second);
    await flush();

    expect(context.state).toBe('running');
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(context.calls).toEqual(['resume', 'resume']);
  });

  it('settles suspend and resume asynchronously, in call order', async () => {
    const context = new FakeAudioContext();
    await flush();

    void context.suspend();
    void context.resume();
    expect(context.state).toBe('running');
    await flush();
    expect(context.state).toBe('running');

    void context.suspend();
    await flush();
    expect(context.state).toBe('suspended');
    expect(context.calls).toEqual(['suspend', 'resume', 'suspend']);
  });

  it('closes for good: pending resumes reject and later calls reject', async () => {
    const context = new FakeAudioContext({ allowStart: false });
    const pending = context.resume();
    void context.close();
    await expect(pending).rejects.toThrow(/closed/);
    expect(context.state).toBe('closed');
    context.setState('running');
    expect(context.state).toBe('closed');
    await expect(context.resume()).rejects.toMatchObject({ name: 'InvalidStateError' });
    await expect(context.suspend()).rejects.toMatchObject({ name: 'InvalidStateError' });
    await expect(context.close()).rejects.toMatchObject({ name: 'InvalidStateError' });
  });

  it('forces a state such as interrupted and fires statechange once per change', async () => {
    const context = new FakeAudioContext();
    await flush();
    const listener = vi.fn();
    context.addEventListener('statechange', listener);

    context.setState('interrupted');
    context.setState('interrupted');

    expect(context.state).toBe('interrupted');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('FakeAudioContext nodes', () => {
  it('creates every node of the tech stack with its parameters at their defaults', () => {
    const context = new FakeAudioContext({ sampleRate: 44100 });
    const gain = context.createGain();
    const oscillator = context.createOscillator();
    const constant = context.createConstantSource();
    const filter = context.createBiquadFilter();
    const source = context.createBufferSource();
    const buffer = context.createBuffer(2, 441, 44100);
    const wave = context.createPeriodicWave([0, 1], [0, 0.5]);

    expect(context.sampleRate).toBe(44100);
    expect(gain.gain.value).toBe(1);
    expect([oscillator.type, oscillator.frequency.value, oscillator.detune.value]).toEqual([
      'sine',
      440,
      0,
    ]);
    expect(constant.offset.value).toBe(1);
    expect([filter.type, filter.frequency.value, filter.detune.value]).toEqual(['lowpass', 350, 0]);
    expect([filter.Q.value, filter.gain.value]).toEqual([1, 0]);
    expect([source.buffer, source.loop, source.loopStart, source.loopEnd]).toEqual([
      null,
      false,
      0,
      0,
    ]);
    expect([source.playbackRate.value, source.detune.value]).toEqual([1, 0]);
    expect([buffer.numberOfChannels, buffer.length, buffer.duration]).toEqual([2, 441, 0.01]);
    expect([wave.real, wave.imag, wave.disableNormalization]).toEqual([[0, 1], [0, 0.5], false]);
    expect(
      context.createPeriodicWave([0, 1], [0, 0], { disableNormalization: true })
        .disableNormalization,
    ).toBe(true);

    expect(context.nodes.map((node) => node.kind)).toEqual([
      'destination',
      'gain',
      'oscillator',
      'constant-source',
      'biquad-filter',
      'buffer-source',
    ]);
    expect(context.nodesOf('oscillator')).toEqual([oscillator]);
    expect(context.nodesOf('destination')).toEqual([context.destination]);
    expect(context.calls).toEqual([
      'createGain',
      'createOscillator',
      'createConstantSource',
      'createBiquadFilter',
      'createBufferSource',
      'createBuffer',
      'createPeriodicWave',
      'createPeriodicWave',
    ]);
  });

  it('records connections to nodes and to parameters, and follows them to the destination', () => {
    const context = new FakeAudioContext();
    const bus = context.createConstantSource();
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    expect(bus.connect(oscillator.frequency)).toBeUndefined();
    expect(oscillator.connect(filter).connect(gain, 0, 0)).toBe(gain);
    gain.connect(context.destination);

    expect(bus.connections).toEqual([{ target: oscillator.frequency, output: 0, input: 0 }]);
    expect(oscillator.frequency.owner).toBe(oscillator);
    expect(oscillator.frequency.name).toBe('frequency');
    expect(context.reaches(bus, context.destination)).toBe(true);
    expect(context.reaches(gain, oscillator)).toBe(false);
  });

  it('disconnects one target or every target, and refuses what a browser refuses', () => {
    const context = new FakeAudioContext();
    const other = new FakeAudioContext();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    gain.connect(filter);
    gain.connect(filter.frequency);
    gain.connect(context.destination);

    gain.disconnect(filter);
    expect(gain.connections.map(({ target }) => target)).toEqual([
      filter.frequency,
      context.destination,
    ]);
    gain.disconnect();
    expect(gain.connections).toEqual([]);
    expect(gain.disconnects).toEqual([filter, undefined]);

    expect(errorName(() => gain.disconnect(filter))).toBe('InvalidAccessError');
    expect(errorName(() => gain.connect(other.destination))).toBe('InvalidAccessError');
  });

  it('cycles a graph without looping forever when it searches a path', () => {
    const context = new FakeAudioContext();
    const delayed = context.createGain();
    const feedback = context.createGain();
    delayed.connect(feedback).connect(delayed);

    expect(context.reaches(delayed, context.destination)).toBe(false);
  });
});

describe('FakeAudioParam', () => {
  it('records every automation call with its arguments and keeps the last target as its value', () => {
    const param = new FakeAudioContext().createGain().gain;

    expect(param.setValueAtTime(0.5, 0)).toBe(param);
    expect(param.value).toBe(0.5);
    param.linearRampToValueAtTime(0.25, 1);
    expect(param.value).toBe(0.25);
    param.exponentialRampToValueAtTime(0.125, 2);
    expect(param.value).toBe(0.125);
    param.setTargetAtTime(0.75, 2, 0.1);
    expect(param.value).toBe(0.75);
    param.setValueCurveAtTime(new Float32Array([0, 0.5, 1]), 3, 0.5);
    expect(param.value).toBe(1);
    param.cancelScheduledValues(3);
    param.cancelAndHoldAtTime(4);
    expect(param.value).toBe(1);
    param.value = 0.2;
    expect(param.value).toBe(0.2);

    expect(param.calls).toEqual([
      { method: 'setValueAtTime', args: [0.5, 0] },
      { method: 'linearRampToValueAtTime', args: [0.25, 1] },
      { method: 'exponentialRampToValueAtTime', args: [0.125, 2] },
      { method: 'setTargetAtTime', args: [0.75, 2, 0.1] },
      { method: 'setValueCurveAtTime', args: [[0, 0.5, 1], 3, 0.5] },
      { method: 'cancelScheduledValues', args: [3] },
      { method: 'cancelAndHoldAtTime', args: [4] },
    ]);
  });

  it('throws what a browser throws for invalid automation', () => {
    const param = new FakeAudioContext().createGain().gain;

    expect(
      errorName(() => {
        param.value = Number.NaN;
      }),
    ).toBe('TypeError');
    expect(errorName(() => param.setValueAtTime(Number.POSITIVE_INFINITY, 0))).toBe('TypeError');
    expect(errorName(() => param.setTargetAtTime(1, 0, Number.NaN))).toBe('TypeError');
    expect(errorName(() => param.linearRampToValueAtTime(1, -1))).toBe('RangeError');
    expect(errorName(() => param.setTargetAtTime(1, 0, -0.1))).toBe('RangeError');
    expect(errorName(() => param.exponentialRampToValueAtTime(0, 1))).toBe('RangeError');
    expect(errorName(() => param.setValueCurveAtTime([1], 0, 1))).toBe('RangeError');
    expect(errorName(() => param.setValueCurveAtTime([0, 1], 0, 0))).toBe('RangeError');
    expect(errorName(() => param.cancelScheduledValues(-1))).toBe('RangeError');
    expect(errorName(() => param.cancelAndHoldAtTime(-1))).toBe('RangeError');
    expect(param.calls).toEqual([]);
    expect(param).toBeInstanceOf(FakeAudioParam);
  });
});

describe('FakeAudioContext sources', () => {
  it('starts and stops a source, and fires ended once currentTime reaches the stop', () => {
    const context = new FakeAudioContext();
    const oscillator = context.createOscillator();
    const onended = vi.fn();
    const listener = vi.fn();
    oscillator.onended = onended;
    oscillator.addEventListener('ended', listener);

    oscillator.start(1);
    oscillator.stop(2);
    context.currentTime = 1.5;
    expect(oscillator.ended).toBe(false);

    context.currentTime = 2;
    context.currentTime = 3;
    expect([oscillator.startedAt, oscillator.stoppedAt, oscillator.ended]).toEqual([1, 2, true]);
    expect(onended).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('ends a source stopped in the past after a microtask', async () => {
    const context = new FakeAudioContext();
    const constant = context.createConstantSource();
    constant.start();
    context.currentTime = 1;
    expect(constant.ended).toBe(false);

    constant.stop();
    expect(constant.ended).toBe(false);
    await flush();
    expect(constant.ended).toBe(true);
  });

  it('refuses a second start, a stop before start and a negative time', () => {
    const context = new FakeAudioContext();
    const oscillator = context.createOscillator();

    expect(errorName(() => oscillator.stop(1))).toBe('InvalidStateError');
    expect(errorName(() => oscillator.start(-1))).toBe('RangeError');
    oscillator.start();
    expect(errorName(() => oscillator.start())).toBe('InvalidStateError');
    expect(errorName(() => (context.currentTime = -1))).toBe('RangeError');
  });

  it('ends a one-shot buffer source with its buffer or its duration, a looping one only on stop', () => {
    const context = new FakeAudioContext();
    const buffer = context.createBuffer(1, 4000, 8000);
    const whole = context.createBufferSource();
    const part = context.createBufferSource();
    const looping = context.createBufferSource();
    const empty = context.createBufferSource();
    for (const source of [whole, part, looping]) source.buffer = buffer;
    looping.loop = true;

    whole.start(1, 0.25);
    part.start(1, 0, 0.125);
    looping.start(1);
    empty.start(1);
    expect([whole.offset, whole.duration, part.duration]).toEqual([0.25, undefined, 0.125]);
    expect(errorName(() => context.createBufferSource().start(0, -1))).toBe('RangeError');

    context.currentTime = 1.125;
    expect([whole.ended, part.ended]).toEqual([false, true]);
    context.currentTime = 1.25;
    expect(whole.ended).toBe(true);

    context.currentTime = 10;
    expect([looping.ended, empty.ended]).toEqual([false, false]);
    looping.stop(10);
    context.currentTime = 10;
    expect(looping.ended).toBe(true);
  });

  it('lists live nodes, which one-shot sounds that clean up after themselves leave', () => {
    const context = new FakeAudioContext();
    const master = context.createGain();
    master.connect(context.destination);
    const baseline = context.liveNodes();
    expect(baseline).toEqual([master]);

    for (let click = 0; click < 3; click += 1) {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.connect(envelope).connect(master);
      oscillator.onended = () => {
        oscillator.disconnect();
        envelope.disconnect();
      };
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.01);
    }
    const unconnected = context.createOscillator();
    unconnected.start();
    expect(context.liveNodes()).toHaveLength(8);

    context.currentTime = 1;
    expect(context.liveNodes()).toEqual([master, unconnected]);
  });

  it('sets a custom wave only through setPeriodicWave, as a browser does', () => {
    const context = new FakeAudioContext();
    const oscillator = context.createOscillator();
    const wave = context.createPeriodicWave(new Float32Array([0, 0, 1]), new Float32Array(3));

    oscillator.type = 'square';
    expect(oscillator.type).toBe('square');
    expect(errorName(() => (oscillator.type = 'custom'))).toBe('InvalidStateError');

    oscillator.setPeriodicWave(wave);
    expect([oscillator.type, oscillator.periodicWave]).toEqual(['custom', wave]);
    expect(errorName(() => context.createPeriodicWave([0, 1], [0]))).toBe('IndexSizeError');
    expect(errorName(() => context.createPeriodicWave([0], [0]))).toBe('IndexSizeError');
  });

  it('holds channel data in a buffer and refuses an invalid buffer or channel', () => {
    const context = new FakeAudioContext();
    const buffer = context.createBuffer(1, 4, 8000);

    buffer.getChannelData(0)[0] = 0.5;
    buffer.copyToChannel(new Float32Array([0.25, 0.75]), 0, 2);

    expect(Array.from(buffer.getChannelData(0))).toEqual([0.5, 0, 0.25, 0.75]);
    expect(buffer.sampleRate).toBe(8000);
    expect(errorName(() => buffer.getChannelData(1))).toBe('IndexSizeError');
    expect(errorName(() => context.createBuffer(0, 4, 8000))).toBe('NotSupportedError');
    expect(errorName(() => context.createBuffer(1, 0, 8000))).toBe('NotSupportedError');
    expect(errorName(() => context.createBuffer(1, 4, 0))).toBe('NotSupportedError');
  });
});

describe('FakeAudioContext as a stand-in', () => {
  it('records the calls no sound may make: a media element source and a worklet module', async () => {
    const context = new FakeAudioContext();

    expect(context.createMediaElementSource().kind).toBe('media-element-source');
    await context.audioWorklet.addModule();

    expect(context.calls).toEqual(['createMediaElementSource', 'audioWorklet.addModule']);
  });

  it('stands in for an AudioContext and gives an AudioOut onto its destination', () => {
    const context = new FakeAudioContext();
    const out = context.out();

    expect(context.asAudioContext()).toBe(context);
    expect(out.context).toBe(context);
    expect(out.input).toBe(context.destination);
    expect(context.nodes).toEqual([context.destination]);
  });
});

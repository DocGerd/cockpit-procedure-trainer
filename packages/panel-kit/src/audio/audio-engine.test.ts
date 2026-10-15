// @vitest-environment jsdom
import type { JsonObject } from '@cpt/core';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { createAudioEngine } from './audio-engine';
import type { AudioEngine, AudioOut } from './audio-engine';
import { FakeAudioContext } from './fake-audio-context';
import type { FakeAudioContextOptions } from './fake-audio-context';
import { voiceFactories } from './voice-factories';
import type { Voice, VoiceFactory, VoiceFrame } from './voice-factories';

const GESTURES = ['pointerdown', 'pointerup', 'click', 'touchend', 'keydown'] as const;

const flush = async () => {
  for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
};

const engines: AudioEngine[] = [];

afterEach(() => {
  for (const engine of engines.splice(0)) engine.dispose();
  Reflect.deleteProperty(document, 'visibilityState');
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function setup(options?: FakeAudioContextOptions) {
  const contexts: FakeAudioContext[] = [];
  const create = vi.fn(() => {
    const context = new FakeAudioContext(options);
    contexts.push(context);
    return context.asAudioContext();
  });
  const engine = createAudioEngine(document, create);
  engines.push(engine);
  const context = () => {
    const [only] = contexts;
    if (!only || contexts.length > 1)
      throw new Error(`expected one context, got ${contexts.length}`);
    return only;
  };
  const master = () => {
    const [gain] = context().nodesOf('gain');
    if (!gain) throw new Error('no master gain');
    return gain;
  };
  const count = (call: string) => context().calls.filter((name) => name === call).length;
  return { engine, create, contexts, context, master, count };
}

const gesture = (type: string = 'pointerdown', target: EventTarget = document) =>
  target.dispatchEvent(new Event(type, { bubbles: true }));

const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
  document.dispatchEvent(new Event('visibilitychange'));
};

function button(onClick: () => void) {
  const element = document.createElement('button');
  element.addEventListener('click', onClick);
  document.body.append(element);
  return element;
}

describe('createAudioEngine unlock', () => {
  it('never calls the factory with sound off from the start', () => {
    const { engine, create } = setup();
    engine.setEnabled(false);
    engine.setVolume(30);

    for (const type of GESTURES) gesture(type);

    expect(create).not.toHaveBeenCalled();
    expect(engine.out()).toBeUndefined();
    expect(engine.live()).toBe(false);
  });

  it('builds nothing before the first gesture, even when sound is set on again', () => {
    const { engine, create } = setup();
    engine.setEnabled(true);
    engine.setVolume(60);

    expect(create).not.toHaveBeenCalled();
  });

  it.each(GESTURES)(
    'creates the context on the first %s with sound on, live while it starts',
    async (type) => {
      const { engine, create, context, master, count } = setup();

      gesture(type);

      expect(create).toHaveBeenCalledTimes(1);
      expect(context().state).toBe('suspended');
      expect(count('resume')).toBe(1);
      expect(engine.live()).toBe(true);
      expect(engine.out()).toEqual({ context: context(), input: master() });
      expect(context().reaches(master(), context().destination)).toBe(true);

      await flush();
      expect(context().state).toBe('running');
      expect(engine.live()).toBe(true);

      for (const later of GESTURES) gesture(later);
      expect(create).toHaveBeenCalledTimes(1);
      expect(count('resume')).toBe(1);
    },
  );

  it('counts the overlapping resumes of one tap, live until every one is refused', async () => {
    const { engine, create } = setup({ allowStart: false });
    const refusals: (() => void)[] = [];
    vi.spyOn(FakeAudioContext.prototype, 'resume').mockImplementation(
      () =>
        new Promise((_, reject) => {
          refusals.push(() => reject(new DOMException('refused', 'NotAllowedError')));
        }),
    );

    for (const type of GESTURES) gesture(type);
    await flush();
    expect(create).toHaveBeenCalledTimes(1);
    expect(refusals).toHaveLength(GESTURES.length);
    expect(engine.live()).toBe(true);

    for (const refuse of refusals.splice(0, GESTURES.length - 1)) refuse();
    await flush();
    expect(engine.live()).toBe(true);
    for (const refuse of refusals.splice(0)) refuse();
    await flush();
    expect(engine.live()).toBe(false);

    gesture();
    expect(engine.live()).toBe(true);
  });

  it('runs before the control handler of the same gesture, so its click has a context', () => {
    const { engine } = setup();
    const seen: unknown[] = [];
    const control = button(() => seen.push(engine.live(), engine.out()?.context));

    gesture('click', control);

    expect(seen).toEqual([true, expect.any(FakeAudioContext)]);
  });

  it('takes the listeners off at once when the browser hands back a running context', () => {
    const running = new FakeAudioContext();
    running.setState('running');
    engines.push(createAudioEngine(document, () => running.asAudioContext()));
    const removed = vi.spyOn(document, 'removeEventListener');

    gesture();

    expect(removed.mock.calls.map(([type]) => type)).toEqual([...GESTURES]);
  });

  it('keeps a touch context starting from pointerdown until the touchend resume runs it', async () => {
    const { engine, context, count } = setup({ allowStart: false });

    gesture('pointerdown');
    await flush();
    expect(context().state).toBe('suspended');
    expect(engine.live()).toBe(true);

    context().allowStart = true;
    gesture('touchend');
    await flush();

    expect(count('resume')).toBe(2);
    expect(context().state).toBe('running');
    expect(engine.live()).toBe(true);
  });

  it('drops out of live() when a resume is refused, and tries again on the next gesture', async () => {
    const { engine, context } = setup({ allowStart: false });
    const resume = vi
      .spyOn(FakeAudioContext.prototype, 'resume')
      .mockRejectedValue(new DOMException('refused', 'NotAllowedError'));

    gesture();
    expect(engine.live()).toBe(true);
    await flush();

    expect(context().state).toBe('suspended');
    expect(engine.live()).toBe(false);
    gesture('touchend');
    expect(resume).toHaveBeenCalledTimes(2);
  });

  it('installs the listeners again when the context leaves running, as Safari interrupts it', async () => {
    const { engine, context, count } = setup();
    gesture();
    await flush();

    context().setState('interrupted');
    expect(engine.live()).toBe(false);
    gesture('touchend');
    await flush();

    expect(count('resume')).toBe(2);
    expect(context().state).toBe('running');
    expect(engine.live()).toBe(true);
  });

  it('with sound off from the start, builds the context inside the gesture that switches it on', async () => {
    const { engine, create, context, master } = setup();
    engine.setVolume(50);
    engine.setEnabled(false);
    const builtInHandler: number[] = [];
    const toggle = button(() => {
      engine.setEnabled(true);
      builtInHandler.push(create.mock.calls.length);
    });

    gesture('click', toggle);

    expect(builtInHandler).toEqual([1]);
    expect(master().gain.value).toBe(0.25);
    expect(engine.live()).toBe(true);
    await flush();
    expect(context().state).toBe('running');
  });

  it('stays silent and throws nothing without AudioContext, as in jsdom', () => {
    expect(typeof AudioContext).toBe('undefined');
    const engine = createAudioEngine(document);
    engines.push(engine);

    expect(() => {
      for (const type of GESTURES) gesture(type);
      engine.setEnabled(false);
      engine.setVolume(20);
      engine.setEnabled(true);
      setVisibility('hidden');
      setVisibility('visible');
    }).not.toThrow();
    expect(engine.out()).toBeUndefined();
    expect(engine.live()).toBe(false);
  });

  it('builds the browser AudioContext by default', () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const engine = createAudioEngine(document);
    engines.push(engine);

    gesture();

    expect(engine.out()?.context).toBeInstanceOf(FakeAudioContext);
  });

  it('stays silent, says why and stops asking when the factory throws', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const failure = new DOMException('no audio device', 'NotSupportedError');
    const create = vi.fn((): AudioContext => {
      throw failure;
    });
    const engine = createAudioEngine(document, create);
    engines.push(engine);

    expect(() => gesture()).not.toThrow();
    gesture('touchend');

    expect(create).toHaveBeenCalledTimes(1);
    expect(engine.out()).toBeUndefined();
    expect(engine.live()).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]).toContain(failure);
  });

  it('closes a context it cannot wire up, and stays silent', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const broken = new FakeAudioContext();
    vi.spyOn(broken, 'createGain').mockImplementation(() => {
      throw new DOMException('no gain', 'NotSupportedError');
    });
    const create = vi.fn(() => broken.asAudioContext());
    const engine = createAudioEngine(document, create);
    engines.push(engine);

    gesture();
    gesture('touchend');
    await flush();

    expect(create).toHaveBeenCalledTimes(1);
    expect(broken.state).toBe('closed');
    expect(engine.out()).toBeUndefined();
    expect(engine.live()).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('drops a context the browser closed on its own and builds a new one on the next gesture', async () => {
    const { engine, contexts, context } = setup();
    gesture();
    await flush();
    const closed = context();

    closed.setState('closed');
    expect(engine.live()).toBe(false);
    expect(engine.out()).toBeUndefined();
    setVisibility('hidden');
    setVisibility('visible');
    gesture('touchend');
    await flush();

    expect(contexts).toHaveLength(2);
    const [, rebuilt] = contexts;
    expect(rebuilt?.state).toBe('running');
    expect(engine.out()?.context).toBe(rebuilt);
    expect(engine.live()).toBe(true);
    expect(closed.calls.filter((call) => call === 'resume')).toHaveLength(1);
  });
});

describe('createAudioEngine master gain', () => {
  it.each([
    [0, 0],
    [50, 0.25],
    [80, 0.64],
    [100, 1],
  ])('builds the master gain at (volume / 100)² for volume %i', (volume, gain) => {
    const { engine, master } = setup();
    engine.setVolume(volume);

    gesture();

    expect(master().gain.value).toBeCloseTo(gain);
  });

  it('follows a volume change with a fade to the new taper, clamped to 0 to 100', () => {
    const { engine, context, master } = setup();
    gesture();
    context().currentTime = 2;

    engine.setVolume(80);
    expect(master().gain.value).toBeCloseTo(0.64);
    const [cancel, fade] = master().gain.calls.slice(-2);
    expect(cancel).toEqual({ method: 'cancelScheduledValues', args: [2] });
    expect(fade).toEqual({
      method: 'setTargetAtTime',
      args: [expect.closeTo(0.64), 2, expect.any(Number)],
    });

    engine.setVolume(150);
    expect(master().gain.value).toBe(1);
    engine.setVolume(-5);
    expect(master().gain.value).toBe(0);
    const calls = master().gain.calls.length;
    engine.setVolume(Number.NaN);
    engine.setVolume(0);
    expect(master().gain.calls).toHaveLength(calls);
  });

  it('fades to 0 when switched off and suspends only once the fade is done', async () => {
    vi.useFakeTimers();
    const { engine, context, master, count } = setup();
    gesture();
    await flush();
    context().currentTime = 1;

    engine.setEnabled(false);
    expect(master().gain.value).toBe(0);
    const [cancel, fade] = master().gain.calls.slice(-2);
    expect(cancel).toEqual({ method: 'cancelScheduledValues', args: [1] });
    expect(fade).toEqual({ method: 'setTargetAtTime', args: [0, 1, expect.any(Number)] });
    expect(engine.live()).toBe(false);

    const fadeMs = Math.round(5 * Number(fade?.args[2]) * 1000);
    vi.advanceTimersByTime(fadeMs - 1);
    expect(count('suspend')).toBe(0);
    vi.advanceTimersByTime(1);
    expect(count('suspend')).toBe(1);
    await flush();
    expect(context().state).toBe('suspended');
  });

  it('keeps the volume while off and fades to it when switched on again', async () => {
    vi.useFakeTimers();
    const { engine, master } = setup();
    gesture();
    await flush();
    engine.setEnabled(false);

    engine.setVolume(50);
    expect(master().gain.value).toBe(0);
    engine.setEnabled(true);

    expect(master().gain.value).toBe(0.25);
  });

  it('leaves the context running when switched off and on before the fade ends', async () => {
    vi.useFakeTimers();
    const { engine, context, count } = setup();
    gesture();
    await flush();

    engine.setEnabled(false);
    engine.setEnabled(true);
    vi.runAllTimers();
    await flush();

    expect(count('suspend')).toBe(0);
    expect(context().state).toBe('running');
    expect(engine.live()).toBe(true);
  });

  it('leaves the context running when switched on while the suspend is in flight', async () => {
    vi.useFakeTimers();
    const { engine, context, count } = setup();
    gesture();
    await flush();

    engine.setEnabled(false);
    vi.runAllTimers();
    engine.setEnabled(true);
    await flush();

    expect(count('suspend')).toBe(1);
    expect(context().state).toBe('running');
    expect(engine.live()).toBe(true);
  });

  it('ignores a gesture while sound is off and the context is suspended', async () => {
    vi.useFakeTimers();
    const { engine, count } = setup();
    gesture();
    await flush();
    engine.setEnabled(false);
    vi.runAllTimers();
    await flush();

    gesture();

    expect(count('resume')).toBe(1);
  });
});

describe('createAudioEngine tab visibility', () => {
  it('suspends while the tab is hidden and resumes when it is shown with sound on', async () => {
    const { engine, context, count } = setup();
    gesture();
    await flush();

    setVisibility('hidden');
    expect(engine.live()).toBe(false);
    await flush();
    expect(count('suspend')).toBe(1);
    expect(context().state).toBe('suspended');

    setVisibility('visible');
    await flush();
    expect(count('resume')).toBe(2);
    expect(context().state).toBe('running');
    expect(engine.live()).toBe(true);
  });

  it('stays suspended when the tab is shown with sound off', async () => {
    const { engine, context, count } = setup();
    gesture();
    await flush();
    engine.setEnabled(false);

    setVisibility('hidden');
    setVisibility('visible');
    await flush();

    expect(count('resume')).toBe(1);
    expect(context().state).toBe('suspended');
  });

  it('waits for the next gesture when the browser refuses the resume as the tab is shown', async () => {
    const { engine, context } = setup();
    gesture();
    await flush();
    setVisibility('hidden');
    await flush();
    const resume = vi
      .spyOn(context(), 'resume')
      .mockRejectedValueOnce(new DOMException('refused', 'NotAllowedError'));

    setVisibility('visible');
    await flush();
    expect(context().state).toBe('suspended');
    expect(engine.live()).toBe(false);

    gesture('touchend');
    await flush();
    expect(resume).toHaveBeenCalledTimes(2);
    expect(context().state).toBe('running');
    expect(engine.live()).toBe(true);
  });
});

describe('createAudioEngine subscribers and disposal', () => {
  it('tells subscribers when the context, the state or the setting changes', async () => {
    const { engine, context } = setup();
    const listener = vi.fn();
    const unsubscribe = engine.subscribe(listener);

    gesture();
    expect(listener).toHaveBeenCalled();
    listener.mockClear();
    await flush();
    expect(listener).toHaveBeenCalled();
    listener.mockClear();
    engine.setEnabled(false);
    expect(listener).toHaveBeenCalled();
    listener.mockClear();
    setVisibility('hidden');
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    listener.mockClear();
    context().setState('interrupted');
    expect(listener).not.toHaveBeenCalled();
  });

  it('serves every subscriber when one throws, and reports the error', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { engine } = setup();
    const failure = new Error('subscriber failed');
    engine.subscribe(() => {
      throw failure;
    });
    const later = vi.fn();
    engine.subscribe(later);

    expect(() => gesture()).not.toThrow();
    expect(later).toHaveBeenCalledTimes(1);
    await flush();

    expect(later.mock.calls.length).toBeGreaterThan(1);
    expect(error).toHaveBeenCalledWith(failure);
  });

  it('lets the off-fade suspend fail quietly on a context the browser closed meanwhile', async () => {
    vi.useFakeTimers();
    const { engine, context, count } = setup();
    gesture();
    await flush();

    engine.setEnabled(false);
    context().setState('closed');
    vi.runAllTimers();
    await flush();

    expect(count('suspend')).toBe(1);
    expect(engine.out()).toBeUndefined();
  });

  it('cancels the suspend of a pending off-fade on dispose', async () => {
    vi.useFakeTimers();
    const { engine, count } = setup();
    gesture();
    await flush();

    engine.setEnabled(false);
    engine.dispose();
    vi.runAllTimers();
    await flush();

    expect(count('suspend')).toBe(0);
  });

  it('closes the context, drops it and removes every listener on dispose', async () => {
    const { engine, context, count } = setup();
    gesture();
    await flush();
    const listener = vi.fn();
    engine.subscribe(listener);

    engine.dispose();
    engine.dispose();
    await flush();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(count('close')).toBe(1);
    expect(context().state).toBe('closed');
    expect(engine.out()).toBeUndefined();
    expect(engine.live()).toBe(false);

    const calls = [...context().calls];
    engine.setEnabled(false);
    engine.setEnabled(true);
    engine.setVolume(10);
    setVisibility('hidden');
    setVisibility('visible');
    gesture();
    expect(context().calls).toEqual(calls);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('builds nothing after dispose and ignores a resume that settles late', async () => {
    const { engine, create, context } = setup();
    const listener = vi.fn();
    engine.subscribe(listener);
    gesture();
    engine.dispose();
    listener.mockClear();
    const added = vi.spyOn(document, 'addEventListener');
    await flush();

    expect(listener).not.toHaveBeenCalled();
    expect(added).not.toHaveBeenCalled();
    gesture();
    expect(create).toHaveBeenCalledTimes(1);
    expect(context().state).toBe('closed');

    const fresh = setup();
    fresh.engine.dispose();
    gesture();
    expect(fresh.create).not.toHaveBeenCalled();
  });

  it('never loads a worklet module or a media element source', async () => {
    vi.useFakeTimers();
    const { engine, context } = setup();
    gesture();
    await flush();
    engine.setVolume(40);
    engine.setEnabled(false);
    vi.runAllTimers();
    engine.setEnabled(true);
    setVisibility('hidden');
    setVisibility('visible');
    await flush();
    engine.dispose();

    expect(context().calls).not.toContain('audioWorklet.addModule');
    expect(context().calls).not.toContain('createMediaElementSource');
  });
});

describe('audio types', () => {
  it('gives voices an output: a context and the node they connect to', () => {
    expectTypeOf<AudioOut>().toEqualTypeOf<{
      readonly context: BaseAudioContext;
      readonly input: AudioNode;
    }>();
  });

  it('types the engine as spec §6.7 has it', () => {
    expectTypeOf<AudioEngine>().toEqualTypeOf<{
      setEnabled(on: boolean): void;
      setVolume(level: number): void;
      out(): AudioOut | undefined;
      live(): boolean;
      subscribe(listener: () => void): () => void;
      dispose(): void;
    }>();
    expectTypeOf(createAudioEngine).toEqualTypeOf<
      (target: Document, create?: () => AudioContext) => AudioEngine
    >();
  });

  it('types a voice, its frame and its factory as spec §6.7 has them', () => {
    expectTypeOf<VoiceFrame>().toEqualTypeOf<{
      readonly nowMs: number;
      readonly live: boolean;
      readonly jump: readonly string[];
    }>();
    expectTypeOf<Voice>().toEqualTypeOf<{
      update(inputs: Readonly<Record<string, number>>, frame: VoiceFrame): void;
      stop(): void;
    }>();
    expectTypeOf<VoiceFactory>().toEqualTypeOf<{
      create(out: AudioOut, options: JsonObject): Voice;
      problems(options: JsonObject): readonly string[];
    }>();
    expectTypeOf(voiceFactories).toEqualTypeOf<Readonly<Record<string, VoiceFactory>>>();
  });

  it('registers voices under kebab-case ids, each with a factory and an option check', () => {
    expect(Object.keys(voiceFactories)).toContain('piston-engine');
    for (const [id, factory] of Object.entries(voiceFactories)) {
      expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(factory.create).toBeTypeOf('function');
      expect(factory.problems).toBeTypeOf('function');
    }
  });
});

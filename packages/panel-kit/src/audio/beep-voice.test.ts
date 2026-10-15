import type { Tone } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import type { AudioOut } from './audio-engine';
import { MAX_LIVE_BEEPS, createBeepPlayer } from './beep-voice';
import { FakeAudioContext, FakeGainNode, type FakeOscillatorNode } from './fake-audio-context';

const setup = () => {
  const context = new FakeAudioContext();
  return { context, player: createBeepPlayer(context.out()) };
};

const PAIR: readonly Tone[] = [
  { hz: 1000, ms: 100, pauseMs: 50 },
  { hz: 2000, ms: 200 },
];

const BROKEN: readonly Tone[] = [
  { hz: 1000, ms: 100, pauseMs: 50 },
  { hz: Number.NaN, ms: 100 },
];

const envelopeOf = (oscillator: FakeOscillatorNode) => {
  const target = oscillator.connections[0]?.target;
  if (!(target instanceof FakeGainNode)) throw new Error('A tone plays through its own envelope.');
  return target;
};

const peak = (envelope: FakeGainNode) =>
  Math.max(
    ...envelope.gain.calls.flatMap(({ args }) => (typeof args[0] === 'number' ? [args[0]] : [])),
  );

const accepted = (context: FakeAudioContext, play: () => void) => {
  const before = context.nodesOf('oscillator').length;
  play();
  return (context.nodesOf('oscillator').length - before) / PAIR.length;
};

const fillCap = (play: () => void) => {
  for (let beep = 0; beep < MAX_LIVE_BEEPS; beep += 1) play();
};

describe('createBeepPlayer', () => {
  it('starts each tone after the length and pause of those before it', () => {
    const { context, player } = setup();
    player.play([...PAIR, { hz: 1500, ms: 50 }], 2, 1);
    const oscillators = context.nodesOf('oscillator');
    const expected = [
      [2, 2.1, 1000],
      [2.15, 2.35, 2000],
      [2.35, 2.4, 1500],
    ] as const;
    expect(oscillators).toHaveLength(expected.length);
    for (const [index, [startS, stopS, hz]] of expected.entries()) {
      expect(oscillators[index]?.startedAt).toBeCloseTo(startS);
      expect(oscillators[index]?.stoppedAt).toBeCloseTo(stopS);
      expect(oscillators[index]?.frequency.value).toBe(hz);
    }
  });

  it('plays each tone at the given level', () => {
    const { context, player } = setup();
    player.play(PAIR, 0, 1);
    player.play(PAIR, 10, 0.5);
    const peaks = context.nodesOf('oscillator').map((oscillator) => peak(envelopeOf(oscillator)));
    const [full = 0] = peaks;
    expect(full).toBeGreaterThan(0);
    expect(peaks).toEqual([full, full, full / 2, full / 2]);
  });

  it('plays through the master gain', () => {
    const context = new FakeAudioContext();
    const master = context.createGain();
    master.connect(context.destination);
    const out: AudioOut = {
      context: context.asAudioContext(),
      input: master as unknown as AudioNode,
    };
    createBeepPlayer(out).play(PAIR, 0, 1);
    const oscillators = context.nodesOf('oscillator');
    expect(oscillators).toHaveLength(PAIR.length);
    for (const oscillator of oscillators) {
      expect(envelopeOf(oscillator).connections.map(({ target }) => target)).toEqual([master]);
    }
    const direct = context.nodes.filter((node) =>
      node.connections.some(({ target }) => target === context.destination),
    );
    expect(direct).toEqual([master]);
  });

  it('fades each tone in and out so it does not click', () => {
    const { context, player } = setup();
    player.play([{ hz: 800, ms: 100 }], 1, 1);
    const [oscillator] = context.nodesOf('oscillator');
    if (!oscillator) throw new Error('The tone builds an oscillator.');
    const calls = envelopeOf(oscillator).gain.calls;
    expect(calls[0]).toEqual({ method: 'setValueAtTime', args: [0, 1] });
    expect(calls.at(-1)).toEqual({
      method: 'linearRampToValueAtTime',
      args: [0, oscillator.stoppedAt],
    });
  });

  it('keeps the fades of a very short tone in order', () => {
    const { context, player } = setup();
    player.play([{ hz: 800, ms: 4 }], 1, 1);
    const [oscillator] = context.nodesOf('oscillator');
    if (!oscillator) throw new Error('The tone builds an oscillator.');
    const envelope = envelopeOf(oscillator);
    const times = envelope.gain.calls.map(({ args }) => Number(args[1]));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(times.at(-1)).toBe(oscillator.stoppedAt);
    expect(envelope.gain.calls[1]).toEqual({
      method: 'linearRampToValueAtTime',
      args: [peak(envelope), times[1]],
    });
  });

  it('stops and disconnects every node when the beep ends', () => {
    const { context, player } = setup();
    player.play(PAIR, 0, 1);
    expect(context.liveNodes().length).toBeGreaterThan(0);
    context.currentTime = 0.1;
    expect(context.liveNodes().length).toBeGreaterThan(0);
    context.currentTime = 1;
    expect(context.liveNodes()).toEqual([]);
    for (const node of context.nodes) expect(node.connections).toEqual([]);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'schedules nothing at level %s',
    (level) => {
      const { context, player } = setup();
      player.play(PAIR, 0, level);
      expect(context.calls).toEqual([]);
    },
  );

  it('schedules nothing for an empty sequence', () => {
    const { context, player } = setup();
    player.play([], 0, 1);
    expect(context.calls).toEqual([]);
  });

  it('schedules on a starting context and frees its voices once the context runs', () => {
    const context = new FakeAudioContext({ allowStart: false });
    const player = createBeepPlayer(context.out());
    fillCap(() => player.play(PAIR, 0, 1));
    expect(context.state).toBe('suspended');
    expect(context.nodesOf('oscillator')).toHaveLength(MAX_LIVE_BEEPS * PAIR.length);
    context.setState('running');
    context.currentTime = 1;
    expect(context.liveNodes()).toEqual([]);
    expect(accepted(context, () => player.play(PAIR, 1, 1))).toBe(1);
  });

  it('holds the beep cap and drops the beeps beyond it', () => {
    const { context, player } = setup();
    for (let beep = 0; beep < MAX_LIVE_BEEPS * 3; beep += 1) player.play(PAIR, 0, 1);
    expect(context.nodesOf('oscillator')).toHaveLength(MAX_LIVE_BEEPS * PAIR.length);
  });

  it('holds a voice until the last tone of its beep ends', () => {
    const { context, player } = setup();
    fillCap(() => player.play(PAIR, 0, 1));
    context.currentTime = 0.2;
    const [first, last] = context.nodesOf('oscillator');
    expect(first?.ended).toBe(true);
    expect(last?.ended).toBe(false);
    expect(accepted(context, () => player.play(PAIR, 0.2, 1))).toBe(0);
    context.currentTime = 0.4;
    expect(accepted(context, () => player.play(PAIR, 0.4, 1))).toBe(1);
  });

  it.each([
    ['a tone that is not a number', BROKEN, 0, TypeError],
    ['a start before 0', PAIR, -1, RangeError],
  ] as const)('frees the voice and plays no part of a beep with %s', (_, tones, whenS, error) => {
    const { context, player } = setup();
    for (let beep = 0; beep <= MAX_LIVE_BEEPS; beep += 1) {
      expect(() => player.play(tones, whenS, 1)).toThrow(error);
    }
    for (const node of context.nodes) expect(node.connections).toEqual([]);
    context.currentTime = 10;
    const again = accepted(context, () => fillCap(() => player.play(PAIR, 10, 1)));
    expect(again).toBe(MAX_LIVE_BEEPS);
    expect(accepted(context, () => player.play(PAIR, 10, 1))).toBe(0);
  });

  it('returns live nodes to baseline after many beeps', () => {
    const { context, player } = setup();
    let most = 0;
    for (let beep = 0; beep < 200; beep += 1) {
      player.play(PAIR, context.currentTime, 1);
      most = Math.max(most, context.liveNodes().length);
      context.currentTime += 0.05;
    }
    expect(most).toBeLessThanOrEqual(MAX_LIVE_BEEPS * PAIR.length * 2);
    context.currentTime += 10;
    expect(context.liveNodes()).toEqual([]);
    const time = context.currentTime;
    expect(accepted(context, () => fillCap(() => player.play(PAIR, time, 1)))).toBe(MAX_LIVE_BEEPS);
    expect(accepted(context, () => player.play(PAIR, time, 1))).toBe(0);
  });
});

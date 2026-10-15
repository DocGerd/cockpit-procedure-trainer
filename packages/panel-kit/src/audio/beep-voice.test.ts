import type { Tone } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { MAX_LIVE_BEEPS, createBeepPlayer } from './beep-voice';
import { FakeAudioContext } from './fake-audio-context';

const setup = () => {
  const context = new FakeAudioContext();
  return { context, player: createBeepPlayer(context.out()) };
};

const PAIR: readonly Tone[] = [
  { hz: 1000, ms: 100, pauseMs: 50 },
  { hz: 2000, ms: 200 },
];

const peak = (envelope: {
  gain: { calls: readonly { method: string; args: readonly unknown[] }[] };
}) =>
  Math.max(
    ...envelope.gain.calls.flatMap(({ args }) => (typeof args[0] === 'number' ? [args[0]] : [])),
  );

describe('createBeepPlayer', () => {
  it('starts each tone after the length and pause of those before it', () => {
    const { context, player } = setup();
    player.play(PAIR, 2, 1);
    const [first, second] = context.nodesOf('oscillator');
    expect(first?.startedAt).toBeCloseTo(2);
    expect(first?.stoppedAt).toBeCloseTo(2.1);
    expect(first?.frequency.value).toBe(1000);
    expect(second?.startedAt).toBeCloseTo(2.15);
    expect(second?.stoppedAt).toBeCloseTo(2.35);
    expect(second?.frequency.value).toBe(2000);
  });

  it('reaches the destination at the given level', () => {
    const { context, player } = setup();
    player.play(PAIR, 0, 1);
    player.play(PAIR, 10, 0.5);
    const envelopes = context.nodesOf('gain');
    expect(envelopes).toHaveLength(4);
    for (const oscillator of context.nodesOf('oscillator')) {
      expect(context.reaches(oscillator, context.destination)).toBe(true);
    }
    const [full = 0, half = 0] = [envelopes[0], envelopes[2]].map((node) =>
      node ? peak(node) : 0,
    );
    expect(full).toBeGreaterThan(0);
    expect(half).toBeCloseTo(full / 2);
  });

  it('fades each tone in and out so it does not click', () => {
    const { context, player } = setup();
    player.play([{ hz: 800, ms: 100 }], 1, 1);
    const [envelope] = context.nodesOf('gain');
    const [oscillator] = context.nodesOf('oscillator');
    const calls = envelope?.gain.calls ?? [];
    expect(calls[0]).toEqual({ method: 'setValueAtTime', args: [0, 1] });
    expect(calls.at(-1)?.method).toBe('linearRampToValueAtTime');
    expect(calls.at(-1)?.args).toEqual([0, oscillator?.stoppedAt]);
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
      expect(context.nodes).toHaveLength(1);
    },
  );

  it('schedules nothing for an empty sequence', () => {
    const { context, player } = setup();
    player.play([], 0, 1);
    expect(context.nodes).toHaveLength(1);
  });

  it('schedules on a context that has not started yet', () => {
    const context = new FakeAudioContext({ allowStart: false });
    createBeepPlayer(context.out()).play(PAIR, 0, 1);
    expect(context.state).toBe('suspended');
    expect(context.nodesOf('oscillator')).toHaveLength(2);
  });

  it('holds the beep cap and drops the beeps beyond it', () => {
    const { context, player } = setup();
    for (let beep = 0; beep < MAX_LIVE_BEEPS * 3; beep += 1) player.play(PAIR, 0, 1);
    expect(context.nodesOf('oscillator')).toHaveLength(MAX_LIVE_BEEPS * PAIR.length);
  });

  it('plays again once the beeps have ended', () => {
    const { context, player } = setup();
    for (let beep = 0; beep < MAX_LIVE_BEEPS; beep += 1) player.play(PAIR, 0, 1);
    context.currentTime = 10;
    player.play(PAIR, 10, 1);
    expect(context.nodesOf('oscillator')).toHaveLength((MAX_LIVE_BEEPS + 1) * PAIR.length);
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
  });
});

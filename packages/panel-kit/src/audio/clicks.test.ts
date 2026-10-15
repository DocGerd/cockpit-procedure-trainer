import type { ClickId } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { CLICK_SPACING_S, MAX_LIVE_CLICKS, createClickPlayer } from './clicks';
import { FakeAudioContext } from './fake-audio-context';

const ALL_CLICKS: readonly ClickId[] = [
  'rocker',
  'detent',
  'notch',
  'key',
  'push-pull',
  'latch',
  'handle',
  'soft',
];

const setup = () => {
  const context = new FakeAudioContext();
  return { context, player: createClickPlayer(context.out()) };
};

const starts = (context: FakeAudioContext) =>
  context.nodesOf('buffer-source').map((node) => node.startedAt);

describe('createClickPlayer', () => {
  it.each(ALL_CLICKS)('%s starts at the given time and reaches the destination', (id) => {
    const { context, player } = setup();
    player.play(id, 1.5);
    const sources = [...context.nodesOf('buffer-source'), ...context.nodesOf('oscillator')];
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      expect(source.startedAt).toBe(1.5);
      expect(source.stoppedAt).toBeGreaterThan(1.5);
      expect(context.reaches(source, context.destination)).toBe(true);
    }
  });

  it.each(ALL_CLICKS)('%s stops and disconnects every node when it ends', (id) => {
    const { context, player } = setup();
    player.play(id, 0);
    expect(context.liveNodes().length).toBeGreaterThan(0);
    context.currentTime = 1;
    expect(context.liveNodes()).toEqual([]);
    for (const node of context.nodes) expect(node.connections).toEqual([]);
  });

  it('keeps a click playing until its sources end', () => {
    const { context, player } = setup();
    player.play('handle', 0);
    context.currentTime = 0.001;
    expect(context.liveNodes().length).toBeGreaterThan(0);
  });

  it('spaces the detents of one move by the rate cap', () => {
    const { context, player } = setup();
    player.play('detent', 2, 3);
    const [first, second, third] = starts(context);
    expect(first).toBe(2);
    expect(second).toBeCloseTo(2 + CLICK_SPACING_S);
    expect(third).toBeCloseTo(2 + 2 * CLICK_SPACING_S);
  });

  it('spaces clicks from separate moves by the same cap', () => {
    const { context, player } = setup();
    player.play('rocker', 1);
    player.play('key', 1);
    const [first, second] = starts(context);
    expect(first).toBe(1);
    expect(second).toBeCloseTo(1 + CLICK_SPACING_S);
  });

  it('starts a later click at its own time once the cap has passed', () => {
    const { context, player } = setup();
    player.play('rocker', 1);
    player.play('rocker', 5);
    expect(starts(context)).toEqual([1, 5]);
  });

  it('plays nothing for a count of zero', () => {
    const { context, player } = setup();
    player.play('rocker', 1, 0);
    expect(context.nodes).toHaveLength(1);
  });

  it('holds the voice cap and drops the clicks beyond it', () => {
    const { context, player } = setup();
    player.play('detent', 0, MAX_LIVE_CLICKS * 4);
    expect(context.nodesOf('buffer-source')).toHaveLength(MAX_LIVE_CLICKS);
    player.play('rocker', 0);
    expect(context.nodesOf('buffer-source')).toHaveLength(MAX_LIVE_CLICKS);
  });

  it('plays again once the clicks have ended', () => {
    const { context, player } = setup();
    player.play('detent', 0, MAX_LIVE_CLICKS);
    context.currentTime = 10;
    player.play('rocker', 10);
    expect(context.nodesOf('buffer-source')).toHaveLength(MAX_LIVE_CLICKS + 1);
  });

  it('returns live nodes to baseline after many clicks', () => {
    const { context, player } = setup();
    let peak = 0;
    for (let move = 0; move < 200; move += 1) {
      player.play(
        ALL_CLICKS[move % ALL_CLICKS.length] ?? 'soft',
        context.currentTime,
        1 + (move % 4),
      );
      peak = Math.max(peak, context.liveNodes().length);
      context.currentTime += 0.03;
    }
    expect(peak).toBeLessThanOrEqual(MAX_LIVE_CLICKS * 4);
    context.currentTime += 10;
    expect(context.liveNodes()).toEqual([]);
  });

  it('builds the noise buffer once', () => {
    const { context, player } = setup();
    player.play('rocker', 0);
    player.play('key', 1);
    expect(context.calls.filter((call) => call === 'createBuffer')).toHaveLength(1);
  });
});

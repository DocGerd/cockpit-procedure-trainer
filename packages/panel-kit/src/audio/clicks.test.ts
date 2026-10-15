import type { ClickId } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { CLICK_SPACING_S, MAX_LIVE_CLICKS, createClickPlayer } from './clicks';
import { type FakeAudioParam, FakeAudioContext } from './fake-audio-context';

const EVERY_CLICK = {
  rocker: true,
  detent: true,
  notch: true,
  key: true,
  'push-pull': true,
  latch: true,
  handle: true,
  soft: true,
} satisfies Record<ClickId, true>;
const ALL_CLICKS = Object.keys(EVERY_CLICK) as ClickId[];

const setup = () => {
  const context = new FakeAudioContext();
  return { context, player: createClickPlayer(context.out()) };
};

const starts = (context: FakeAudioContext) =>
  context.nodesOf('buffer-source').map((node) => node.startedAt);

const nodesPerClick = () => {
  const { context, player } = setup();
  player.play('rocker', 0);
  return context.liveNodes().length;
};

const ramp = (param: FakeAudioParam) => {
  const call = param.calls.find(({ method }) => method === 'exponentialRampToValueAtTime');
  const [value, endS] = (call?.args ?? []) as number[];
  return { value: value ?? Number.NaN, endS: endS ?? Number.NaN };
};

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

  it.each(ALL_CLICKS)('%s decays to silence and drops in pitch before its sources end', (id) => {
    const { context, player } = setup();
    player.play(id, 2);
    const [envelope] = context.nodesOf('gain');
    const [tone] = context.nodesOf('oscillator');
    if (!envelope || !tone) throw new Error('A click builds an envelope and a tone.');
    const sources = [...context.nodesOf('buffer-source'), tone];

    expect(envelope.gain.calls.map(({ method }) => method)).toEqual([
      'setValueAtTime',
      'exponentialRampToValueAtTime',
    ]);
    const [level = 0, startS] = (envelope.gain.calls[0]?.args ?? []) as number[];
    expect(startS).toBe(2);
    expect(level).toBeGreaterThan(0);
    const fade = ramp(envelope.gain);
    expect(fade.value).toBeLessThan(level / 1000);
    expect(fade.endS).toBeGreaterThan(2);
    for (const source of sources) expect(source.endTime()).toBeGreaterThanOrEqual(fade.endS);

    const [startHz = 0, pitchS] = (tone.frequency.calls[0]?.args ?? []) as number[];
    expect(pitchS).toBe(2);
    const drop = ramp(tone.frequency);
    expect(drop.value).toBeLessThan(startHz);
    expect(drop.endS).toBeLessThanOrEqual(tone.endTime() ?? 0);
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

  it('schedules on a context that has not started yet', () => {
    const context = new FakeAudioContext({ allowStart: false });
    const player = createClickPlayer(context.out());
    player.play('key', 0);
    expect(context.state).toBe('suspended');
    expect(starts(context)).toEqual([0]);
  });

  it('spaces the detents of one move by the rate cap, tone and burst together', () => {
    const { context, player } = setup();
    player.play('detent', 2, 3);
    const [first, second, third] = starts(context);
    expect(first).toBe(2);
    expect(second).toBeCloseTo(2 + CLICK_SPACING_S);
    expect(third).toBeCloseTo(2 + 2 * CLICK_SPACING_S);
    expect(context.nodesOf('oscillator').map((node) => node.startedAt)).toEqual(starts(context));
  });

  it('starts a separate move at its own time, even between the detents of another', () => {
    const { context, player } = setup();
    player.play('detent', 1, 3);
    player.play('key', 1.02);
    player.play('rocker', 1.02);
    expect(starts(context).slice(3)).toEqual([1.02, 1.02]);
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

  it('plays a move that reaches the voice cap only up to it', () => {
    const { context, player } = setup();
    const playing = MAX_LIVE_CLICKS - 3;
    for (let click = 0; click < playing; click += 1) player.play('key', 0);
    player.play('detent', 0, 6);
    const detents = starts(context).slice(playing);
    expect(detents).toHaveLength(3);
    expect(detents[0]).toBe(0);
    expect(detents[1]).toBeCloseTo(CLICK_SPACING_S);
    expect(detents[2]).toBeCloseTo(2 * CLICK_SPACING_S);
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
    expect(peak).toBe(MAX_LIVE_CLICKS * nodesPerClick());
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

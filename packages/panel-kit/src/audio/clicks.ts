import type { ClickId } from '@cpt/core';
import type { AudioOut } from './audio-engine';

export type ClickPlayer = {
  /** Plays `count` clicks from `whenS` on the context clock, spaced by the rate cap; a full voice cap drops the rest. */
  play(id: ClickId, whenS: number, count?: number): void;
};

type ClickProfile = {
  readonly noiseHz: number;
  readonly noiseQ: number;
  readonly toneHz: number;
  readonly toneEndHz: number;
  readonly toneType: OscillatorType;
  readonly decayS: number;
  readonly level: number;
};

const CLICK_PROFILES = {
  rocker: {
    noiseHz: 3200,
    noiseQ: 1.2,
    toneHz: 900,
    toneEndHz: 300,
    toneType: 'square',
    decayS: 0.03,
    level: 0.5,
  },
  detent: {
    noiseHz: 2400,
    noiseQ: 2,
    toneHz: 1400,
    toneEndHz: 600,
    toneType: 'triangle',
    decayS: 0.022,
    level: 0.4,
  },
  notch: {
    noiseHz: 1500,
    noiseQ: 1,
    toneHz: 520,
    toneEndHz: 220,
    toneType: 'triangle',
    decayS: 0.045,
    level: 0.55,
  },
  key: {
    noiseHz: 4200,
    noiseQ: 1.5,
    toneHz: 1800,
    toneEndHz: 800,
    toneType: 'square',
    decayS: 0.018,
    level: 0.4,
  },
  'push-pull': {
    noiseHz: 1100,
    noiseQ: 0.8,
    toneHz: 260,
    toneEndHz: 110,
    toneType: 'sine',
    decayS: 0.07,
    level: 0.7,
  },
  latch: {
    noiseHz: 2800,
    noiseQ: 3,
    toneHz: 1100,
    toneEndHz: 450,
    toneType: 'square',
    decayS: 0.04,
    level: 0.5,
  },
  handle: {
    noiseHz: 800,
    noiseQ: 0.7,
    toneHz: 180,
    toneEndHz: 80,
    toneType: 'sine',
    decayS: 0.09,
    level: 0.75,
  },
  soft: {
    noiseHz: 700,
    noiseQ: 0.7,
    toneHz: 240,
    toneEndHz: 140,
    toneType: 'sine',
    decayS: 0.05,
    level: 0.25,
  },
} satisfies Record<ClickId, ClickProfile>;

/** The least time between the starts of two clicks, which spaces the detents of one move. */
export const CLICK_SPACING_S = 0.05;
/** Clicks scheduled or sounding at once; a click that would exceed it is dropped. */
export const MAX_LIVE_CLICKS = 8;

const NOISE_SECONDS = 0.1;
const SILENCE = 0.0001;
const TAIL_S = 0.01;

// A fixed generator keeps every click the same and a test repeatable.
function noiseSamples(length: number): Float32Array {
  const samples = new Float32Array(length);
  let state = 0x2545f491;
  for (let index = 0; index < length; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    samples[index] = state / 0x80000000 - 1;
  }
  return samples;
}

/** One-shot clicks on `out`: every node a click builds stops and disconnects itself when it ends. */
export function createClickPlayer(out: AudioOut): ClickPlayer {
  const { context, input } = out;
  let noise: AudioBuffer | undefined;
  let live = 0;
  let nextFreeS = 0;

  const noiseBuffer = () => {
    if (!noise) {
      const length = Math.ceil(context.sampleRate * NOISE_SECONDS);
      noise = context.createBuffer(1, length, context.sampleRate);
      noise.copyToChannel(noiseSamples(length) as Float32Array<ArrayBuffer>, 0);
    }
    return noise;
  };

  const click = (profile: ClickProfile, startS: number) => {
    const endS = startS + profile.decayS + TAIL_S;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(profile.level, startS);
    envelope.gain.exponentialRampToValueAtTime(SILENCE, startS + profile.decayS);
    envelope.connect(input);

    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(profile.noiseHz, startS);
    filter.Q.setValueAtTime(profile.noiseQ, startS);
    filter.connect(envelope);

    const burst = context.createBufferSource();
    burst.buffer = noiseBuffer();
    burst.connect(filter);

    const tone = context.createOscillator();
    tone.type = profile.toneType;
    tone.frequency.setValueAtTime(profile.toneHz, startS);
    tone.frequency.exponentialRampToValueAtTime(profile.toneEndHz, startS + profile.decayS);
    tone.connect(envelope);

    const sources = [burst, tone];
    let ended = 0;
    const onEnded = () => {
      ended += 1;
      if (ended < sources.length) return;
      for (const node of [...sources, filter, envelope]) node.disconnect();
      live -= 1;
    };
    for (const source of sources) {
      source.onended = onEnded;
      source.start(startS);
      source.stop(endS);
    }
    live += 1;
  };

  return {
    play(id, whenS, count = 1) {
      const profile = CLICK_PROFILES[id];
      for (let step = 0; step < count && live < MAX_LIVE_CLICKS; step += 1) {
        const startS = Math.max(whenS, nextFreeS);
        click(profile, startS);
        nextFreeS = startS + CLICK_SPACING_S;
      }
    },
  };
}

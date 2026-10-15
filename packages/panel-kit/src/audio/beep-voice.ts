import type { Tone } from '@cpt/core';
import type { AudioOut } from './audio-engine';

export type BeepPlayer = {
  /**
   * Plays the tones one after another from `whenS` on the context clock, each followed by its
   * pause, at `level` times the beep gain. A level that is not above 0 or a full voice cap plays
   * nothing. Call it only while the engine is `live()`: a beep on a context that never runs keeps
   * its voice.
   */
  play(tones: readonly Tone[], whenS: number, level: number): void;
};

/** Beeps scheduled or sounding at once; a beep that would exceed it is dropped. */
export const MAX_LIVE_BEEPS = 4;

const BEEP_GAIN = 0.2;
const EDGE_S = 0.005;
const MS_PER_S = 1000;

/** One-shot beeps on `out`: every node a tone builds stops and disconnects itself when it ends. */
export function createBeepPlayer(out: AudioOut): BeepPlayer {
  const { context, input } = out;
  let live = 0;

  const tone = (spec: Tone, startS: number, peak: number, ended: () => void) => {
    const lengthS = spec.ms / MS_PER_S;
    const endS = startS + lengthS;
    const edgeS = Math.min(EDGE_S, lengthS / 4);

    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, startS);
    envelope.gain.linearRampToValueAtTime(peak, startS + edgeS);
    envelope.gain.setValueAtTime(peak, endS - edgeS);
    envelope.gain.linearRampToValueAtTime(0, endS);

    const oscillator = context.createOscillator();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(spec.hz, startS);
    oscillator.connect(envelope);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
      ended();
    };
    envelope.connect(input);
    oscillator.start(startS);
    oscillator.stop(endS);
  };

  return {
    play(tones, whenS, level) {
      if (!(level > 0) || !Number.isFinite(level) || tones.length === 0 || live >= MAX_LIVE_BEEPS) {
        return;
      }
      const peak = BEEP_GAIN * level;
      let remaining = tones.length;
      const ended = () => {
        remaining -= 1;
        if (remaining === 0) live -= 1;
      };
      let startS = whenS;
      live += 1;
      for (const spec of tones) {
        tone(spec, startS, peak, ended);
        startS += (spec.ms + (spec.pauseMs ?? 0)) / MS_PER_S;
      }
    },
  };
}

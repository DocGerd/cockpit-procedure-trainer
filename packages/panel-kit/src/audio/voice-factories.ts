import type { JsonObject } from '@cpt/core';
import type { AudioOut } from './audio-engine';
import { pistonEngine } from './voices/piston-engine';

export type VoiceFrame = {
  readonly nowMs: number;
  readonly live: boolean;
  /** The inputs that take their target at once (spec §6.3). */
  readonly jump: readonly string[];
};

export type Voice = {
  update(inputs: Readonly<Record<string, number>>, frame: VoiceFrame): void;
  stop(): void;
};

export type VoiceFactory = {
  create(out: AudioOut, options: JsonObject): Voice;
  problems(options: JsonObject): readonly string[];
};

export const voiceFactories: Readonly<Record<string, VoiceFactory>> = {
  'piston-engine': pistonEngine,
};

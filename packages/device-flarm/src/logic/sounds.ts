import type { DeviceSounds, SoundCue } from '@cpt/core';
import type { FlarmState, FlarmVolume } from './flarm';

export type FlarmBeep = 'startup' | 'volume';

// Intake §3.8.4 gives a tone at the volume step and nothing about pitch, length or the level
// ratios: the values here are assumed (unverified).
export const VOLUME_LEVELS: Readonly<Record<FlarmVolume, number>> = {
  loud: 1,
  medium: 0.5,
  quiet: 0.25,
  silent: 0,
};

export const beeps: DeviceSounds<FlarmState, FlarmBeep>['beeps'] = {
  startup: [{ hz: 2000, ms: 200 }],
  volume: [{ hz: 2000, ms: 100 }],
};

export function cues(previous: FlarmState, next: FlarmState): readonly SoundCue<FlarmBeep>[] {
  const level = Object.hasOwn(VOLUME_LEVELS, next.volume) ? VOLUME_LEVELS[next.volume] : 0;
  if (next.lowSupply || level === 0) return [];
  if (!previous.powered && next.powered) return [{ beep: 'startup', level }];
  if (previous.powered && next.powered && previous.volume !== next.volume) {
    return [{ beep: 'volume', level }];
  }
  return [];
}

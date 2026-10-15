import { deviceControls, deviceCues } from '@cpt/core';
import type {
  Aircraft,
  ControlChange,
  Device,
  DeviceStates,
  Session,
  SoundDefinition,
  TrainerState,
} from '@cpt/core';
import {
  clickCount,
  clickFor,
  createBeepPlayer,
  createClickPlayer,
  voiceFactories,
} from '@cpt/panel-kit';
import type {
  AudioEngine,
  AudioOut,
  BeepPlayer,
  ClickPlayer,
  Voice,
  VoiceFactory,
} from '@cpt/panel-kit';

type Sound = {
  readonly id: string;
  readonly definition: SoundDefinition<unknown>;
  readonly inputs: readonly [string, (state: TrainerState<unknown>) => number][];
};

type Playing = { readonly sound: Sound; readonly voice: Voice };

/**
 * Plays the cockpit of `session` through `engine` until the returned disconnect. A click or a
 * device cue is dropped while the engine is not live: a late one would answer a move made long
 * before. Voice frames are timed by `clock`, never by counting notifications. The first audio
 * error is logged, stops every voice and silences this connection; it never reaches the session,
 * so the pilot's press and the advance timer keep working.
 */
export function connectCockpitAudio(
  session: Session,
  aircraft: Aircraft,
  registry: readonly Device[],
  engine: AudioEngine,
  clock: () => number = () => performance.now(),
  voices: Readonly<Record<string, VoiceFactory>> = voiceFactories,
): () => void {
  const controls = { ...aircraft.controls, ...deviceControls(aircraft, registry) };
  const sounds: readonly Sound[] = Object.entries(aircraft.sounds ?? {}).map(
    ([id, definition]) => ({ id, definition, inputs: Object.entries(definition.inputs ?? {}) }),
  );
  let silenced = false;
  let clicks: { readonly out: AudioOut; readonly player: ClickPlayer } | undefined;
  let beeps: { readonly out: AudioOut; readonly player: BeepPlayer } | undefined;
  let bank: { readonly out: AudioOut; readonly playing: Playing[] } | undefined;
  let seen:
    { readonly epoch: number; readonly phase: string; readonly devices: DeviceStates } | undefined;
  let wasLive = false;

  // A context the browser closed is replaced by a new one, which needs its own players and voices.
  const playerFor = (out: AudioOut) => {
    if (clicks?.out !== out) clicks = { out, player: createClickPlayer(out) };
    return clicks.player;
  };

  const beepPlayerFor = (out: AudioOut) => {
    if (beeps?.out !== out) beeps = { out, player: createBeepPlayer(out) };
    return beeps.player;
  };

  const stopVoices = () => {
    const playing = bank?.playing ?? [];
    bank = undefined;
    const errors: unknown[] = [];
    for (const { voice } of playing) {
      try {
        voice.stop();
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) throw errors[0];
  };

  const silence = (message: string, error: unknown) => {
    silenced = true;
    console.error(message, error);
    try {
      stopVoices();
    } catch {
      // The error that silenced the connection is the one logged.
    }
  };

  const build = (sound: Sound, out: AudioOut) => {
    const { voice } = sound.definition;
    const factory = Object.hasOwn(voices, voice) ? voices[voice] : undefined;
    if (!factory) throw new Error(`No voice "${voice}" is registered.`);
    return factory.create(out, sound.definition.options ?? {});
  };

  const frame = () => {
    if (silenced) return;
    let where = 'in the cockpit sound';
    try {
      const state = session.state();
      const epoch = session.epoch();
      const phase = session.phase();
      const baseline = seen === undefined || seen.epoch !== epoch;
      const carried = !baseline && seen?.phase !== phase;
      const previous = seen?.devices;
      seen = { epoch, phase, devices: state.devices };

      if (sounds.length > 0) {
        const out = session.status().kind === 'failed' ? undefined : engine.out();
        if (bank && bank.out !== out) stopVoices();
        let fresh = false;
        if (!bank && out) {
          const playing: Playing[] = [];
          bank = { out, playing };
          fresh = true;
          for (const sound of sounds) {
            where = `in the ${sound.id} sound (voice ${sound.definition.voice})`;
            playing.push({ sound, voice: build(sound, out) });
          }
        }
        if (bank) {
          const live = engine.live();
          const jumpAll = baseline || fresh || (live && !wasLive);
          wasLive = live;
          const nowMs = clock();
          for (const { sound, voice } of bank.playing) {
            where = `in the ${sound.id} sound (voice ${sound.definition.voice})`;
            const inputs = Object.fromEntries(
              sound.inputs.map(([name, read]) => [name, read(state)]),
            );
            const jump = jumpAll
              ? Object.keys(inputs)
              : carried
                ? (sound.definition.carried ?? [])
                : [];
            voice.update(inputs, { nowMs, live, jump });
          }
        }
      }

      if (baseline || !previous) return;
      where = 'in the device cues';
      const cues = deviceCues(aircraft, registry, previous, state.devices);
      if (cues.length === 0) return;
      const out = engine.out();
      if (!out || !engine.live()) return;
      for (const cue of cues) {
        where = `at the ${cue.install} ${cue.beep} beep`;
        const tones = registry.find((device) => device.id === cue.device)?.sounds?.beeps[cue.beep];
        if (tones) beepPlayerFor(out).play(tones, out.context.currentTime, cue.level ?? 1);
      }
    } catch (error) {
      silence(`Cockpit sound stopped after an audio error ${where}.`, error);
    }
  };

  const click = (change: ControlChange) => {
    const definition = controls[change.id];
    const id = definition && clickFor(definition, change);
    const out = engine.out();
    if (!definition || id === undefined || !out || !engine.live()) return;
    playerFor(out).play(id, out.context.currentTime, clickCount(definition, change));
  };

  const unsubscribeState = session.subscribe(frame);
  const unsubscribeChanges = session.onControlChange((change) => {
    if (silenced) return;
    try {
      click(change);
    } catch (error) {
      // Built from the change alone: the engine call that threw must not run again here.
      silence(
        `Cockpit sound stopped after an audio error at ${change.id} (${change.kind} ${String(change.from)} to ${String(change.to)}).`,
        error,
      );
    }
  });
  frame();

  return () => {
    unsubscribeState();
    unsubscribeChanges();
    if (silenced) return;
    silenced = true;
    try {
      stopVoices();
    } catch (error) {
      console.error('Cockpit sound stopped after an audio error as a voice stopped.', error);
    }
  };
}

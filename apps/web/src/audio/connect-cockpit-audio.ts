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

type StopFailure = { readonly sound: Sound; readonly error: unknown };

const label = (sound: Sound) => `the ${sound.id} sound (voice ${sound.definition.voice})`;

const unstopped = (failures: readonly StopFailure[]) =>
  `could not stop ${failures.map(({ sound }) => label(sound)).join(', ')}`;

/**
 * Plays the cockpit of `session` through `engine` until the returned disconnect. A click or a
 * device cue is dropped while the engine is not live: a late one would answer a move made long
 * before. Voice frames are timed by `clock`, never by counting notifications. The first audio
 * error is logged, stops every voice and silences this connection; it never reaches the session,
 * so the pilot's press and the advance timer keep working. A voice that throws as it stops is
 * logged and does not silence the connection: the others stop all the same.
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
  let where = 'in the cockpit sound';

  // A context the browser closed is replaced by a new one, which needs its own players.
  const playerFor = (out: AudioOut) => {
    if (clicks?.out !== out) clicks = { out, player: createClickPlayer(out) };
    return clicks.player;
  };

  const beepPlayerFor = (out: AudioOut) => {
    if (beeps?.out !== out) beeps = { out, player: createBeepPlayer(out) };
    return beeps.player;
  };

  const stopVoices = (): StopFailure[] => {
    const playing = bank?.playing ?? [];
    bank = undefined;
    const failures: StopFailure[] = [];
    for (const { sound, voice } of playing) {
      try {
        voice.stop();
      } catch (error) {
        failures.push({ sound, error });
      }
    }
    return failures;
  };

  const logStops = (failures: readonly StopFailure[]) => {
    if (failures.length === 0) return;
    console.error(`Cockpit sound ${unstopped(failures)}.`, ...failures.map(({ error }) => error));
  };

  const silence = (message: string, error: unknown) => {
    silenced = true;
    const failures = stopVoices();
    const stops = failures.length > 0 ? ` It ${unstopped(failures)}.` : '';
    console.error(`${message}${stops}`, error, ...failures.map((failure) => failure.error));
  };

  const build = (sound: Sound, out: AudioOut) => {
    const { voice } = sound.definition;
    const factory = Object.hasOwn(voices, voice) ? voices[voice] : undefined;
    if (!factory) throw new Error(`No voice "${voice}" is registered.`);
    return factory.create(out, sound.definition.options ?? {});
  };

  const feed = (
    state: TrainerState<unknown>,
    live: boolean,
    jumping: 'all' | 'carried' | 'none',
  ) => {
    if (!bank) return;
    const nowMs = clock();
    for (const { sound, voice } of bank.playing) {
      where = `in ${label(sound)}`;
      const inputs = Object.fromEntries(sound.inputs.map(([name, read]) => [name, read(state)]));
      const jump =
        jumping === 'all'
          ? Object.keys(inputs)
          : jumping === 'carried'
            ? (sound.definition.carried ?? [])
            : [];
      voice.update(inputs, { nowMs, live, jump });
    }
    where = 'in the cockpit sound';
  };

  const frame = () => {
    if (silenced) return;
    where = 'in the cockpit sound';
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
        if (bank && bank.out !== out) logStops(stopVoices());
        let fresh = false;
        if (!bank && out) {
          const playing: Playing[] = [];
          bank = { out, playing };
          fresh = true;
          for (const sound of sounds) {
            where = `in ${label(sound)}`;
            playing.push({ sound, voice: build(sound, out) });
          }
          where = 'in the cockpit sound';
        }
        if (bank) {
          const live = engine.live();
          const jumpAll = baseline || fresh || (live && !wasLive);
          wasLive = live;
          feed(state, live, jumpAll ? 'all' : carried ? 'carried' : 'none');
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
        const declared = registry.find((device) => device.id === cue.device)?.sounds?.beeps;
        const tones =
          declared && Object.hasOwn(declared, cue.beep) ? declared[cue.beep] : undefined;
        if (!tones) throw new Error(`No beep "${cue.beep}" on device "${cue.device}".`);
        beepPlayerFor(out).play(tones, out.context.currentTime, cue.level ?? 1);
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

  // The engine turns audible between two session frames; a graph left from before would play until
  // the next one. A context change leaves the rebuild to that frame, which jumps a fresh bank.
  const resync = () => {
    if (silenced) return;
    const live = engine.live();
    const resumed = live && !wasLive;
    wasLive = live;
    if (!resumed || !bank || bank.out !== engine.out()) return;
    where = 'in the cockpit sound';
    try {
      feed(session.state(), live, 'all');
    } catch (error) {
      silence(`Cockpit sound stopped after an audio error ${where}.`, error);
    }
  };

  const unsubscribeState = session.subscribe(frame);
  const unsubscribeEngine = engine.subscribe(resync);
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
    unsubscribeEngine();
    unsubscribeChanges();
    if (silenced) return;
    silenced = true;
    logStops(stopVoices());
  };
}

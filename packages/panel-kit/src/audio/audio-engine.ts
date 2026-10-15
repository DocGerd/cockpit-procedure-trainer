export type AudioOut = { readonly context: BaseAudioContext; readonly input: AudioNode };

export type AudioEngine = {
  /** Sound starts on. Switching it on counts as a user gesture: call it from the switch's handler. */
  setEnabled(on: boolean): void;
  setVolume(level: number): void;
  out(): AudioOut | undefined;
  live(): boolean;
  subscribe(listener: () => void): () => void;
  dispose(): void;
};

// A browser grants audio only to a user activation, and which events count differs by input and
// browser (spec §6.7); capture runs before the control's own handler.
const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'click', 'touchend', 'keydown'] as const;
const UNLOCK_LISTENER = { capture: true, passive: true } as const;

const FADE_TIME_CONSTANT_S = 0.03;
const TIME_CONSTANTS_TO_SILENCE = 5;
const FADE_OUT_MS = FADE_TIME_CONSTANT_S * TIME_CONSTANTS_TO_SILENCE * 1000;
const FULL_VOLUME = 100;

const taper = (volume: number) => (volume / FULL_VOLUME) ** 2;

const ignore = () => undefined;

const browserContext = (): AudioContext | undefined =>
  typeof AudioContext === 'function' ? new AudioContext() : undefined;

/**
 * The engine starts with sound on and its unlock listeners installed, so its owner applies the
 * stored setting through `setEnabled` right after creating it, before any gesture can build a context.
 */
export function createAudioEngine(target: Document, create?: () => AudioContext): AudioEngine {
  const make: () => AudioContext | undefined = create ?? browserContext;
  const listeners = new Set<() => void>();
  let enabled = true;
  let volume = FULL_VOLUME;
  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  let out: AudioOut | undefined;
  let startingResumes = 0;
  let armed = false;
  let unavailable = false;
  let disposed = false;
  let suspendTimer: ReturnType<typeof setTimeout> | undefined;

  const notify = () => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const arm = (on: boolean) => {
    if (armed === on) return;
    armed = on;
    for (const type of UNLOCK_EVENTS) {
      if (on) target.addEventListener(type, unlock, UNLOCK_LISTENER);
      else target.removeEventListener(type, unlock, UNLOCK_LISTENER);
    }
  };

  const drop = () => {
    context?.removeEventListener('statechange', onStateChange);
    context = undefined;
    master = undefined;
    out = undefined;
  };

  // A context the browser closed cannot run again: the next gesture builds a new one.
  const onStateChange = () => {
    if (disposed) return;
    if (context?.state === 'closed') drop();
    arm(!unavailable && context?.state !== 'running');
    notify();
  };

  const build = (): AudioContext | undefined => {
    let built: AudioContext | undefined;
    try {
      built = make();
      if (!built) {
        unavailable = true;
        return undefined;
      }
      const gain = built.createGain();
      gain.gain.value = taper(volume);
      gain.connect(built.destination);
      built.addEventListener('statechange', onStateChange);
      context = built;
      master = gain;
      out = { context: built, input: gain };
      return built;
    } catch (error) {
      unavailable = true;
      built?.close().catch(ignore);
      console.warn('Sound stays off: the audio context could not be built.', error);
      return undefined;
    }
  };

  // A context counts as starting until the resume of its gesture settles (spec §6.3, live()).
  const createOrResume = () => {
    const current = context ?? build();
    if (current) {
      startingResumes += 1;
      const settle = () => {
        startingResumes -= 1;
        onStateChange();
      };
      current.resume().then(settle, settle);
    }
    onStateChange();
  };

  const unlock = () => {
    if (enabled) createOrResume();
  };

  const fade = (level: number) => {
    if (!context || !master) return;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(level, context.currentTime, FADE_TIME_CONSTANT_S);
  };

  const onVisibilityChange = () => {
    if (context && target.visibilityState === 'hidden') context.suspend().catch(ignore);
    else if (context && enabled) context.resume().catch(onStateChange);
    notify();
  };

  arm(true);
  target.addEventListener('visibilitychange', onVisibilityChange);

  return {
    setEnabled(on) {
      if (disposed || on === enabled) return;
      enabled = on;
      clearTimeout(suspendTimer);
      if (on) {
        if (!unavailable) createOrResume();
        fade(taper(volume));
      } else if (context) {
        const fading = context;
        fade(0);
        suspendTimer = setTimeout(() => fading.suspend().catch(ignore), FADE_OUT_MS);
      }
      notify();
    },
    setVolume(level) {
      if (disposed || !Number.isFinite(level)) return;
      const next = Math.min(FULL_VOLUME, Math.max(0, level));
      if (next === volume) return;
      volume = next;
      if (enabled) fade(taper(volume));
    },
    out: () => out,
    live: () =>
      enabled &&
      context !== undefined &&
      context.state !== 'closed' &&
      target.visibilityState !== 'hidden' &&
      (context.state === 'running' || startingResumes > 0),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      if (disposed) return;
      clearTimeout(suspendTimer);
      arm(false);
      disposed = true;
      target.removeEventListener('visibilitychange', onVisibilityChange);
      context?.close().catch(ignore);
      drop();
      notify();
      listeners.clear();
    },
  };
}

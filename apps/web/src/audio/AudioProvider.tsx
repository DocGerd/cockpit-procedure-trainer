import { createAudioEngine } from '@cpt/panel-kit';
import type { AudioEngine } from '@cpt/panel-kit';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_VOLUME, MAX_VOLUME, readSound, readVolume, writeSetting } from '../storage';
import type { SoundSetting } from '../storage';

export type AudioSettingsValue = {
  sound: SoundSetting;
  volume: number;
  setSound(sound: SoundSetting): void;
  setVolume(volume: number): void;
};

const noop = () => undefined;

const SILENT: AudioSettingsValue = {
  sound: 'on',
  volume: DEFAULT_VOLUME,
  setSound: noop,
  setVolume: noop,
};

const AudioSettingsContext = createContext<AudioSettingsValue>(SILENT);

// Apart from the settings, so a volume change does not re-render what only needs the engine.
const AudioEngineContext = createContext<AudioEngine | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [sound, setSoundState] = useState(readSound);
  const [volume, setVolumeState] = useState(readVolume);
  const [engine, setEngine] = useState<AudioEngine | undefined>(undefined);
  // Holds the latest choice for an engine the effect creates later; a remount builds a fresh one.
  const latest = useRef({ sound, volume });

  useEffect(() => {
    const created = createAudioEngine(document);
    created.setEnabled(latest.current.sound === 'on');
    created.setVolume(latest.current.volume);
    setEngine(created);
    return () => {
      created.dispose();
      setEngine(undefined);
    };
  }, []);

  // The switch handler calls this, which is the user gesture that lets a context start.
  const setSound = useCallback(
    (next: SoundSetting) => {
      latest.current.sound = next;
      setSoundState(next);
      writeSetting('sound', next);
      engine?.setEnabled(next === 'on');
    },
    [engine],
  );

  const setVolume = useCallback(
    (next: number) => {
      if (!Number.isFinite(next)) return;
      const level = Math.min(MAX_VOLUME, Math.max(0, Math.round(next)));
      latest.current.volume = level;
      setVolumeState(level);
      writeSetting('volume', String(level));
      engine?.setVolume(level);
    },
    [engine],
  );

  const value = useMemo<AudioSettingsValue>(
    () => ({ sound, volume, setSound, setVolume }),
    [sound, volume, setSound, setVolume],
  );

  return (
    <AudioEngineContext.Provider value={engine}>
      <AudioSettingsContext.Provider value={value}>{children}</AudioSettingsContext.Provider>
    </AudioEngineContext.Provider>
  );
}

/** Outside the provider this is silent rather than an error, so a bare Shell still renders. */
export function useAudio(): AudioSettingsValue {
  return useContext(AudioSettingsContext);
}

/** Undefined until the provider's effect has created it, and outside the provider. */
export function useAudioEngine(): AudioEngine | undefined {
  return useContext(AudioEngineContext);
}

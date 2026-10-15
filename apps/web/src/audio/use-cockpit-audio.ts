import { useEffect } from 'react';
import { deviceRegistry } from '../device-registry';
import { useTrainer } from '../trainer';
import { useAudio } from './AudioProvider';
import { connectCockpitAudio } from './connect-cockpit-audio';

/** The trainer screen's sound: leaving the screen disconnects it, though the session runs on. */
export function useCockpitAudio(): void {
  const { session, aircraft } = useTrainer();
  const { engine } = useAudio();
  useEffect(() => {
    if (!engine) return;
    return connectCockpitAudio(session, aircraft, deviceRegistry, engine);
  }, [session, aircraft, engine]);
}

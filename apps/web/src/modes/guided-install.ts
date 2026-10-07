import { useCurrentTarget } from '../checklist';
import { useTrainer } from '../trainer';
import { targetInstall } from './target';

/** The install whose device the Guided step targets; undefined in any other mode. */
export function useGuidedInstall(): string | undefined {
  const { aircraft, mode } = useTrainer();
  const target = useCurrentTarget();
  return mode === 'guided' && target ? targetInstall(aircraft, target) : undefined;
}

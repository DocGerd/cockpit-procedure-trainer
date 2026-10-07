import { useCurrentTarget } from '../checklist';
import { useSessionState, useTrainer } from '../trainer';
import { targetInstall } from './target';

/** The install whose device the Guided step targets; undefined in any other mode. */
export function useGuidedInstall(): string | undefined {
  const { aircraft, mode } = useTrainer();
  const target = useCurrentTarget();
  return mode === 'guided' && target ? targetInstall(aircraft, target) : undefined;
}

export type GuidedKey = {
  readonly install: string;
  /** The control's id within the device, as a Screen key carries it in `data-control`. */
  readonly control: string;
  /** The position an action step asks for; a check step names none. */
  readonly position: string | undefined;
};

export function useGuidedKey(): GuidedKey | undefined {
  const { aircraft, mode } = useTrainer();
  const target = useCurrentTarget();
  const position = useSessionState((session) => {
    const checklist = session.checklist();
    const item =
      checklist && !checklist.done ? checklist.procedure.items[checklist.current] : undefined;
    return item?.type === 'action' ? String(item.position) : undefined;
  });
  if (mode !== 'guided' || !target || !('control' in target)) return undefined;
  const install = targetInstall(aircraft, target);
  if (install === undefined) return undefined;
  return { install, control: target.control.slice(install.length + 1), position };
}

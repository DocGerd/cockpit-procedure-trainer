import { useCurrentTarget } from '../checklist';
import { useSessionState, useTrainer } from '../trainer';
import { targetInstall } from './target';

/** Whether the current step's target is cued: every step in Guided, a step shown with Show me in Practice. */
export function useTargetCued(): boolean {
  const { mode, assisted } = useTrainer();
  const item = useSessionState((session) => session.checklist()?.current);
  return (
    mode === 'guided' || (mode === 'practice' && item !== undefined && assisted.includes(item))
  );
}

/** The install whose device the cued step targets; undefined when no step is cued. */
export function useGuidedInstall(): string | undefined {
  const { aircraft } = useTrainer();
  const cued = useTargetCued();
  const target = useCurrentTarget();
  return cued && target ? targetInstall(aircraft, target) : undefined;
}

export type GuidedKey = {
  readonly install: string;
  /** The control's id within the device, as a Screen key carries it in `data-control`. */
  readonly control: string;
  /** The position an action step asks for; a check step names none. */
  readonly position: string | undefined;
};

export function useGuidedKey(): GuidedKey | undefined {
  const { aircraft } = useTrainer();
  const cued = useTargetCued();
  const target = useCurrentTarget();
  const position = useSessionState((session) => {
    const checklist = session.checklist();
    const item =
      checklist && !checklist.done ? checklist.procedure.items[checklist.current] : undefined;
    return item?.type === 'action' ? String(item.position) : undefined;
  });
  if (!cued || !target || !('control' in target)) return undefined;
  const install = targetInstall(aircraft, target);
  if (install === undefined) return undefined;
  return { install, control: target.control.slice(install.length + 1), position };
}

import { springsBack } from '@cpt/core';
import { useSessionState, useTrainer } from '../trainer';

/**
 * The control of the pilot's latest stray move on the current item while it is still off where
 * it stood. Only a move made in Guided counts; a spring-back control is back by itself.
 */
export function useStray(): string | undefined {
  const { mode, guidedFrom } = useTrainer();
  return useSessionState((snapshot) => {
    const checklist = snapshot.checklist();
    if (mode !== 'guided' || !checklist || checklist.done) return undefined;
    const { deviations } = checklist;
    const latest = deviations.at(-1);
    if (deviations.length <= guidedFrom || latest?.itemIndex !== checklist.current) {
      return undefined;
    }
    if (latest.kind !== 'unexpected-control' && latest.kind !== 'out-of-order') return undefined;
    const { controlId, from, position } = latest;
    if (controlId === undefined || from === undefined || position === undefined) return undefined;
    if (springsBack(checklist.controls[controlId], position)) return undefined;
    return snapshot.state().controls[controlId] === from ? undefined : controlId;
  });
}

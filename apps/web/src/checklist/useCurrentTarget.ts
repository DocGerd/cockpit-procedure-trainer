import { inFlow } from '@cpt/core';
import type { ProcedureDefinition } from '@cpt/core';
import { useSessionState } from '../trainer';
import { leadingCount } from './ItemGroup';

export type CurrentTarget = { readonly control: string } | { readonly indicator: string };

export function useCurrentTarget(): CurrentTarget | undefined {
  return useSessionState((snapshot): CurrentTarget | undefined => {
    const checklist = snapshot.checklist();
    if (!checklist || checklist.done) return undefined;
    const item = checklist.procedure.items[checklist.current];
    if (item?.type === 'action') return { control: item.control };
    if (item?.type === 'check') return item.target;
    return undefined;
  });
}

/** How many items the procedure's opening flow has; they are always its first items. */
export function flowLength(procedure: ProcedureDefinition<unknown>): number {
  return leadingCount(procedure.items, (item) => item.type === 'action' && item.flow === true);
}

export type FlowTarget = { readonly index: number; readonly control: string };

const sameTargets = (a: readonly FlowTarget[], b: readonly FlowTarget[]) =>
  a.length === b.length &&
  a.every((target, at) => target.index === b[at]?.index && target.control === b[at]?.control);

/** The open items of a running flow, in scan order; empty once the flow is done. */
export function useFlowTargets(): readonly FlowTarget[] {
  return useSessionState((snapshot) => {
    const checklist = snapshot.checklist();
    if (!checklist || !inFlow(checklist)) return [];
    return checklist.procedure.items.flatMap((item, index) =>
      item.type === 'action' && item.flow === true && !checklist.completed.includes(index)
        ? [{ index, control: item.control }]
        : [],
    );
  }, sameTargets);
}

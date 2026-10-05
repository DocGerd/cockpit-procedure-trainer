import type { ControlChange, ProcedureDefinition, ProcedureItem, TrainerState } from '../contract';

export type Deviation = {
  readonly kind: 'unexpected-control' | 'unmet-check';
  readonly itemIndex: number;
  readonly controlId?: string;
};

export type ChecklistState<S> = {
  readonly procedure: ProcedureDefinition<S>;
  readonly current: number;
  readonly completed: readonly number[];
  readonly deviations: readonly Deviation[];
  readonly done: boolean;
};

function currentItem<S>(checklist: ChecklistState<S>): ProcedureItem<S> | undefined {
  return checklist.done ? undefined : checklist.procedure.items[checklist.current];
}

function actionSatisfied<S>(item: ProcedureItem<S>, state: TrainerState<S>): boolean {
  return (
    item.type === 'action' &&
    state.controls[item.control] === item.position &&
    (item.holdUntil?.(state) ?? true)
  );
}

function complete<S>(checklist: ChecklistState<S>): ChecklistState<S> {
  const next = checklist.current + 1;
  return {
    ...checklist,
    current: next,
    completed: [...checklist.completed, checklist.current],
    done: next >= checklist.procedure.items.length,
  };
}

function settle<S>(checklist: ChecklistState<S>, state: TrainerState<S>): ChecklistState<S> {
  let settled = checklist;
  for (let item = currentItem(settled); item && actionSatisfied(item, state);) {
    settled = complete(settled);
    item = currentItem(settled);
  }
  return settled;
}

function targets<S>(item: ProcedureItem<S>, id: string): boolean {
  if (item.type === 'action') return item.control === id;
  return item.type === 'check' && 'control' in item.target && item.target.control === id;
}

function deviate<S>(checklist: ChecklistState<S>, deviation: Deviation): ChecklistState<S> {
  return { ...checklist, deviations: [...checklist.deviations, deviation] };
}

export function startChecklist<S>(
  procedure: ProcedureDefinition<S>,
  state: TrainerState<S>,
): ChecklistState<S> {
  return settle(
    {
      procedure,
      current: 0,
      completed: [],
      deviations: [],
      done: procedure.items.length === 0,
    },
    state,
  );
}

export function observeControl<S>(
  checklist: ChecklistState<S>,
  change: ControlChange,
  state: TrainerState<S>,
): ChecklistState<S> {
  const item = currentItem(checklist);
  if (!item) return checklist;
  const deviating =
    change.source === 'pilot' && change.kind === 'position' && !targets(item, change.id);
  return settle(
    deviating
      ? deviate(checklist, {
          kind: 'unexpected-control',
          itemIndex: checklist.current,
          controlId: change.id,
        })
      : checklist,
    state,
  );
}

export function observeState<S>(
  checklist: ChecklistState<S>,
  state: TrainerState<S>,
): ChecklistState<S> {
  return settle(checklist, state);
}

export function checkOff<S>(
  checklist: ChecklistState<S>,
  state: TrainerState<S>,
): ChecklistState<S> {
  const item = currentItem(checklist);
  if (!item || item.type === 'action') return checklist;
  const unmet = item.type === 'check' && !item.condition(state);
  const marked = unmet
    ? deviate(checklist, { kind: 'unmet-check', itemIndex: checklist.current })
    : checklist;
  return settle(complete(marked), state);
}

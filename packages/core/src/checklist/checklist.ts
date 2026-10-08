import type {
  ControlChange,
  ControlDefinition,
  ControlPosition,
  ProcedureDefinition,
  ProcedureItem,
  TrainerState,
} from '../contract';

export type DeviationKind =
  'unexpected-control' | 'out-of-order' | 'wrong-position' | 'unmet-check';

export type Deviation = {
  readonly kind: DeviationKind;
  readonly itemIndex: number;
  readonly controlId?: string;
  /** For `out-of-order`: the later item whose target the pilot set. */
  readonly laterItem?: number;
  /** For `wrong-position`: where the pilot left the target control. */
  readonly position?: ControlPosition;
  /** For `unmet-check`: the reading the pilot gave. */
  readonly response?: number;
  /**
   * Made while the opening flow ran, which has no order: the deviation belongs to the flow, and
   * `itemIndex` is only the first flow item still open at the time.
   */
  readonly duringFlow?: true;
};

export type ChecklistState<S> = {
  readonly procedure: ProcedureDefinition<S>;
  readonly current: number;
  readonly completed: readonly number[];
  readonly deviations: readonly Deviation[];
  readonly done: boolean;
  readonly controls: Readonly<Record<string, ControlDefinition>>;
  /** The pilot set the current action's target to its position, or verified it. */
  readonly operated: boolean;
  /** The pilot moved the current action's target since it became current. */
  readonly touched: boolean;
  readonly repeating: boolean;
};

function springsBack(definition: ControlDefinition | undefined, position: string | number) {
  if (definition?.kind === 'momentary') return position === definition.positions[1];
  return (
    definition?.kind === 'rotary' &&
    typeof position === 'string' &&
    definition.springBack !== undefined &&
    Object.hasOwn(definition.springBack, position)
  );
}

function currentItem<S>(checklist: ChecklistState<S>): ProcedureItem<S> | undefined {
  return checklist.done ? undefined : checklist.procedure.items[checklist.current];
}

type FlowItem<S> = Extract<ProcedureItem<S>, { type: 'action' }>;

function isFlowItem<S>(item: ProcedureItem<S> | undefined): item is FlowItem<S> {
  return item?.type === 'action' && item.flow === true;
}

/** Whether the procedure's opening flow is still running; its actions then complete in any order. */
export function inFlow<S>(checklist: ChecklistState<S>): boolean {
  return isFlowItem(currentItem(checklist));
}

function flowTargets<S>(procedure: ProcedureDefinition<S>, id: string): boolean {
  return procedure.items.some((item) => isFlowItem(item) && item.control === id);
}

/** Whether the current item takes a tick: a check, a confirm, or an action the pilot may verify. */
export function takesTick<S>(checklist: ChecklistState<S>): boolean {
  const item = currentItem(checklist);
  if (item?.type !== 'action') return item !== undefined;
  return !item.flow && !springsBack(checklist.controls[item.control], item.position);
}

function actionSatisfied<S>(checklist: ChecklistState<S>, state: TrainerState<S>): boolean {
  const item = currentItem(checklist);
  return (
    item?.type === 'action' &&
    checklist.operated &&
    state.controls[item.control] === item.position &&
    (item.holdUntil?.(state) ?? true)
  );
}

function complete<S>(checklist: ChecklistState<S>, index = checklist.current): ChecklistState<S> {
  const completed = [...checklist.completed, index];
  const { length } = checklist.procedure.items;
  const open = checklist.procedure.items.findIndex((_, at) => !completed.includes(at));
  return {
    ...checklist,
    current: open === -1 ? length : open,
    completed,
    operated: false,
    touched: false,
    repeating: false,
    done: open === -1,
  };
}

// A flow item stays ticked once its target held; the checklist after the flow verifies it.
function settleFlow<S>(checklist: ChecklistState<S>, state: TrainerState<S>): ChecklistState<S> {
  return checklist.procedure.items.reduce(
    (next, item, index) =>
      isFlowItem(item) &&
      !next.completed.includes(index) &&
      state.controls[item.control] === item.position &&
      (item.holdUntil?.(state) ?? true)
        ? complete(next, index)
        : next,
    checklist,
  );
}

function settle<S>(checklist: ChecklistState<S>, state: TrainerState<S>): ChecklistState<S> {
  if (inFlow(checklist)) return settleFlow(checklist, state);
  return actionSatisfied(checklist, state) ? complete(checklist) : checklist;
}

function targets<S>(item: ProcedureItem<S>, id: string): boolean {
  if (item.type === 'action') return item.control === id;
  return item.type === 'check' && 'control' in item.target && item.target.control === id;
}

function laterItem<S>(checklist: ChecklistState<S>, change: ControlChange): number | undefined {
  const index = checklist.procedure.items.findIndex(
    (item, at) =>
      at > checklist.current &&
      item.type === 'action' &&
      item.control === change.id &&
      change.kind === 'position' &&
      item.position === change.to,
  );
  return index === -1 ? undefined : index;
}

// A run of changes to one control, such as a drag, is one deviation; the last change names it.
function deviate<S>(checklist: ChecklistState<S>, deviation: Deviation): ChecklistState<S> {
  const last = checklist.deviations.at(-1);
  const repeat =
    checklist.repeating &&
    last !== undefined &&
    last.itemIndex === deviation.itemIndex &&
    last.controlId === deviation.controlId;
  return {
    ...checklist,
    repeating: true,
    deviations: [...(repeat ? checklist.deviations.slice(0, -1) : checklist.deviations), deviation],
  };
}

function leftAt<S>(checklist: ChecklistState<S>, state: TrainerState<S>): Deviation | undefined {
  const item = currentItem(checklist);
  if (item?.type !== 'action') return undefined;
  const position = state.controls[item.control];
  if (position === item.position) return undefined;
  return {
    kind: 'wrong-position',
    itemIndex: checklist.current,
    controlId: item.control,
    ...(position !== undefined && { position }),
  };
}

export function startChecklist<S>(
  procedure: ProcedureDefinition<S>,
  state: TrainerState<S>,
  controls: Readonly<Record<string, ControlDefinition>>,
): ChecklistState<S> {
  return settle(
    {
      procedure,
      current: 0,
      completed: [],
      deviations: [],
      done: procedure.items.length === 0,
      controls,
      operated: false,
      touched: false,
      repeating: false,
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
  const moved = change.source === 'pilot' && change.kind === 'position';
  const flowing = inFlow(checklist);
  // Moves on the target itself are never deviations, so a stepped control such as a
  // transponder digit may pass through wrong values; only the position left behind counts.
  // In a flow every flow target is the target, and no position is left behind.
  const deviating =
    moved && !(flowing ? flowTargets(checklist.procedure, change.id) : targets(item, change.id));
  const touching = moved && !flowing && item.type === 'action' && item.control === change.id;
  const operating = touching && item.position === change.to;
  const operated = checklist.operated || operating;
  const touched = checklist.touched || touching;
  const repeating = checklist.repeating && deviating;
  let next =
    operated === checklist.operated &&
    touched === checklist.touched &&
    repeating === checklist.repeating
      ? checklist
      : { ...checklist, operated, touched, repeating };
  if (deviating) {
    const left = checklist.touched ? leftAt(checklist, state) : undefined;
    if (left) next = { ...deviate(next, left), touched: false };
    const later = laterItem(checklist, change);
    next = deviate(next, {
      itemIndex: checklist.current,
      controlId: change.id,
      ...(flowing && { duringFlow: true }),
      ...(later === undefined
        ? { kind: 'unexpected-control' }
        : { kind: 'out-of-order', laterItem: later }),
    });
  }
  return settle(next, state);
}

export function observeState<S>(
  checklist: ChecklistState<S>,
  state: TrainerState<S>,
): ChecklistState<S> {
  return settle(checklist, state);
}

/**
 * Ticks the current item. An action other than a spring-back press counts as verified: it then
 * completes like an operated one, and a target not at its position is recorded as wrong.
 */
export function checkOff<S>(
  checklist: ChecklistState<S>,
  state: TrainerState<S>,
  response?: number,
): ChecklistState<S> {
  const item = currentItem(checklist);
  if (!item || !takesTick(checklist)) return checklist;
  if (item.type === 'action') {
    const left = leftAt(checklist, state);
    if (left) return settle(complete(deviate(checklist, left)), state);
    return settle({ ...checklist, operated: true }, state);
  }
  const spec = item.type === 'check' ? item.response : undefined;
  const answer = spec && response;
  const misread =
    spec !== undefined &&
    answer !== undefined &&
    !(Math.abs(answer - spec.reading(state)) <= spec.tolerance);
  const unmet = item.type === 'check' && (!item.condition(state) || misread);
  const marked = unmet
    ? deviate(checklist, {
        kind: 'unmet-check',
        itemIndex: checklist.current,
        ...(answer !== undefined && { response: answer }),
      })
    : checklist;
  return settle(complete(marked), state);
}

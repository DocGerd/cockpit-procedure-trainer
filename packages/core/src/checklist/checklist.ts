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
  /** For `wrong-position`: where the pilot left the target control. For a stray move: where it ended. */
  readonly position?: ControlPosition;
  /** For a stray move: where the control stood before the pilot moved it. */
  readonly from?: ControlPosition;
  /** For `unmet-check`: the reading the pilot gave. */
  readonly response?: number;
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
  /** Time since the procedure started, until it is done. */
  readonly elapsedMs: number;
  /** Help the pilot took: how often the current item was retried. */
  readonly assists: number;
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

/** Whether the current item takes a tick: a check, a confirm, or an action the pilot may verify. */
export function takesTick<S>(checklist: ChecklistState<S>): boolean {
  const item = currentItem(checklist);
  if (item?.type !== 'action') return item !== undefined;
  return !springsBack(checklist.controls[item.control], item.position);
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

function complete<S>(checklist: ChecklistState<S>): ChecklistState<S> {
  const next = checklist.current + 1;
  return {
    ...checklist,
    current: next,
    completed: [...checklist.completed, checklist.current],
    operated: false,
    touched: false,
    repeating: false,
    done: next >= checklist.procedure.items.length,
  };
}

function settle<S>(checklist: ChecklistState<S>, state: TrainerState<S>): ChecklistState<S> {
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
  const named = repeat && last.from !== undefined ? { ...deviation, from: last.from } : deviation;
  return {
    ...checklist,
    repeating: true,
    deviations: [...(repeat ? checklist.deviations.slice(0, -1) : checklist.deviations), named],
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
      elapsedMs: 0,
      assists: 0,
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
  // Moves on the target itself are never deviations, so a stepped control such as a
  // transponder digit may pass through wrong values; only the position left behind counts.
  const deviating = moved && !targets(item, change.id);
  const touching = moved && item.type === 'action' && item.control === change.id;
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
      position: change.to,
      from: change.from,
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
  dtMs = 0,
): ChecklistState<S> {
  const timed =
    dtMs > 0 && !checklist.done
      ? { ...checklist, elapsedMs: checklist.elapsedMs + dtMs }
      : checklist;
  return settle(timed, state);
}

/** Starts the current item over: what the pilot did on it no longer counts, and it is an assist. */
export function retryItem<S>(checklist: ChecklistState<S>): ChecklistState<S> {
  if (checklist.done) return checklist;
  return {
    ...checklist,
    operated: false,
    touched: false,
    repeating: false,
    assists: checklist.assists + 1,
  };
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

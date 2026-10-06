import type {
  ControlChange,
  ControlDefinition,
  ProcedureDefinition,
  ProcedureItem,
  TrainerState,
} from '../contract';

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
  readonly controls: Readonly<Record<string, ControlDefinition>>;
  readonly pressed: boolean;
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

function actionSatisfied<S>(checklist: ChecklistState<S>, state: TrainerState<S>): boolean {
  const item = currentItem(checklist);
  return (
    item?.type === 'action' &&
    state.controls[item.control] === item.position &&
    (checklist.pressed || !springsBack(checklist.controls[item.control], item.position)) &&
    (item.holdUntil?.(state) ?? true)
  );
}

function complete<S>(checklist: ChecklistState<S>): ChecklistState<S> {
  const next = checklist.current + 1;
  return {
    ...checklist,
    current: next,
    completed: [...checklist.completed, checklist.current],
    pressed: false,
    repeating: false,
    done: next >= checklist.procedure.items.length,
  };
}

function settle<S>(checklist: ChecklistState<S>, state: TrainerState<S>): ChecklistState<S> {
  let settled = checklist;
  while (actionSatisfied(settled, state)) settled = complete(settled);
  return settled;
}

function targets<S>(item: ProcedureItem<S>, id: string): boolean {
  if (item.type === 'action') return item.control === id;
  return item.type === 'check' && 'control' in item.target && item.target.control === id;
}

function deviate<S>(checklist: ChecklistState<S>, deviation: Deviation): ChecklistState<S> {
  const last = checklist.deviations.at(-1);
  const repeat =
    checklist.repeating &&
    last?.kind === deviation.kind &&
    last.itemIndex === deviation.itemIndex &&
    last.controlId === deviation.controlId;
  return {
    ...checklist,
    repeating: true,
    deviations: repeat ? checklist.deviations : [...checklist.deviations, deviation],
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
      pressed: false,
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
  const deviating =
    change.source === 'pilot' && change.kind === 'position' && !targets(item, change.id);
  const pressing =
    change.source === 'pilot' &&
    change.kind === 'position' &&
    item.type === 'action' &&
    item.control === change.id &&
    item.position === change.to;
  const pressed = checklist.pressed || pressing;
  const repeating = checklist.repeating && deviating;
  const noted =
    pressed === checklist.pressed && repeating === checklist.repeating
      ? checklist
      : { ...checklist, pressed, repeating };
  return settle(
    deviating
      ? deviate(noted, {
          kind: 'unexpected-control',
          itemIndex: checklist.current,
          controlId: change.id,
        })
      : noted,
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

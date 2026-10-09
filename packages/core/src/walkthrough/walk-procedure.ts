import type { Aircraft, ControlDefinition, Device, ProcedureItem } from '../contract';
import { deviceControls } from '../devices';
import { flightLegs, procedureOf } from '../phases';
import { STEP_MS } from '../runtime';
import { createSession } from '../session';
import type { Session, SessionControlResult } from '../session';

export const MAX_STEPS = 2000;

export type WalkOptions = {
  readonly devices?: readonly Device[];
  /** The order to do a leading flow in; any order completes it. */
  readonly flowOrder?: 'listed' | 'reversed';
  /** Called with the session once a checklist completed without a deviation, before the next leg. */
  readonly afterChecklist?: (session: Session, procedureId: string) => void;
};

export type WalkResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly aircraft: string;
      readonly procedure: string;
      readonly itemIndex: number;
      readonly item: string;
      readonly reason: string;
    };

type Item = ProcedureItem<unknown>;
type Action = Extract<Item, { type: 'action' }>;

function isPressed(definition: ControlDefinition | undefined, position: string | number): boolean {
  if (definition?.kind === 'momentary') return position === definition.positions[1];
  return (
    definition?.kind === 'rotary' &&
    typeof position === 'string' &&
    definition.springBack !== undefined &&
    Object.hasOwn(definition.springBack, position)
  );
}

// A spring detent is offered only while the control rests at the position it springs back to.
function restMismatch(
  session: Session,
  definition: ControlDefinition | undefined,
  item: Action,
): string | undefined {
  if (definition?.kind !== 'rotary' || typeof item.position !== 'string') return undefined;
  const rest = definition.springBack?.[item.position];
  const at = session.state().controls[item.control];
  if (rest === undefined || at === rest) return undefined;
  return `${item.control} is at ${String(at)}, a press to ${item.position} needs it at ${rest}`;
}

function rejection(result: SessionControlResult): string | undefined {
  if (result.applied || result.reason === 'unchanged') return undefined;
  return `control ${result.reason}`;
}

function progressed(session: Session, index: number): boolean {
  const checklist = session.checklist();
  return checklist === undefined || checklist.done || checklist.completed.includes(index);
}

function advanceUntil(session: Session, done: () => boolean): boolean {
  for (let steps = 0; !done(); steps++) {
    if (steps >= MAX_STEPS) return false;
    session.advance(STEP_MS);
  }
  return true;
}

function performAction(
  session: Session,
  definition: ControlDefinition | undefined,
  item: Action,
  index: number,
): string | undefined {
  const { control, position } = item;
  if (session.guards()[control] === 'closed') {
    const opened = rejection(session.openGuard(control));
    if (opened) return opened;
  }

  const pressed = isPressed(definition, position);
  const stranded = pressed ? restMismatch(session, definition, item) : undefined;
  if (stranded) return stranded;
  if (!pressed && session.state().controls[control] === position) {
    session.checkOff();
  } else {
    const released = definition?.kind === 'momentary' && !pressed;
    const result = released
      ? session.release(control)
      : pressed
        ? session.press(control, definition?.kind === 'momentary' ? undefined : position)
        : session.set(control, position);
    const rejected = rejection(result);
    if (rejected) return rejected;
  }

  const held =
    item.holdUntil === undefined || advanceUntil(session, () => progressed(session, index));
  if (pressed) session.release(control);
  return held ? undefined : `hold condition not met within ${MAX_STEPS} steps`;
}

function performGuard(session: Session, item: Extract<Item, { type: 'guard' }>) {
  const { control, position } = item;
  if (session.guards()[control] === position) {
    session.checkOff();
    return undefined;
  }
  return rejection(position === 'open' ? session.openGuard(control) : session.closeGuard(control));
}

function perform(
  session: Session,
  definition: ControlDefinition | undefined,
  item: Item,
  index: number,
): string | undefined {
  if (item.type === 'action') return performAction(session, definition, item, index);
  if (item.type === 'guard') return performGuard(session, item);
  if (item.type === 'check') {
    if (!advanceUntil(session, () => item.condition(session.state()))) {
      return 'condition not met';
    }
  }
  session.checkOff(item.type === 'check' ? item.response?.reading(session.state()) : undefined);
  return undefined;
}

/** Works the session's running checklist to its end, the way a pilot reading it would. */
function walkChecklist(
  session: Session,
  aircraft: Aircraft,
  controls: Readonly<Record<string, ControlDefinition>>,
  procedureId: string,
  options: WalkOptions,
): WalkResult {
  const procedure = procedureOf(aircraft, procedureId);
  const fail = (itemIndex: number, reason: string): WalkResult => ({
    ok: false,
    aircraft: aircraft.id,
    procedure: procedureId,
    itemIndex,
    item: procedure.items[itemIndex]?.text.en ?? '',
    reason,
  });

  if (procedure.items.length === 0) return fail(0, 'procedure has no items');

  const attempt = (index: number): string | undefined => {
    const item = procedure.items[index] as Item;
    let reason: string | undefined;
    try {
      const definition = item.type === 'action' ? controls[item.control] : undefined;
      reason = perform(session, definition, item, index);
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error);
    }
    const status = session.status();
    if (status.kind === 'failed') reason ??= 'runtime failed';
    if (reason === undefined && !progressed(session, index)) reason = 'item did not complete';
    return reason;
  };

  const flow = procedure.items.flatMap((item, index) =>
    item.type === 'action' && item.flow ? [index] : [],
  );
  if (options.flowOrder === 'reversed') flow.reverse();
  for (const index of flow) {
    if (progressed(session, index)) continue;
    const reason = attempt(index);
    if (reason !== undefined) return fail(index, reason);
  }

  for (let checklist = session.checklist(); checklist && !checklist.done;) {
    const index = checklist.current;
    const reason = attempt(index);
    if (reason !== undefined) return fail(index, reason);
    checklist = session.checklist();
  }

  const finished = session.checklist();
  if (!finished?.done) return fail(finished?.current ?? 0, 'checklist not complete');
  const deviation = finished.deviations[0];
  if (deviation) {
    const named = deviation.controlId === undefined ? '' : ` ${deviation.controlId}`;
    return fail(deviation.itemIndex, `${deviation.kind}${named}`);
  }
  options.afterChecklist?.(session, procedureId);
  return { ok: true };
}

export function walkProcedure(
  aircraft: Aircraft,
  procedureId: string,
  options: WalkOptions = {},
): WalkResult {
  const devices = options.devices ?? [];
  const procedure = procedureOf(aircraft, procedureId);
  const controls = { ...aircraft.controls, ...deviceControls(aircraft, devices) };
  const session = createSession(aircraft, { devices, phase: procedure.startPhase });
  session.startProcedure(procedureId);
  return walkChecklist(session, aircraft, controls, procedureId, options);
}

/** Walks the aircraft's whole flight on one session, each leg from the cockpit the last one left. */
export function walkFlight(aircraft: Aircraft, options: WalkOptions = {}): WalkResult {
  const devices = options.devices ?? [];
  const legs = flightLegs(aircraft);
  const first = legs[0];
  if (first === undefined) {
    return {
      ok: false,
      aircraft: aircraft.id,
      procedure: '',
      itemIndex: 0,
      item: '',
      reason: 'no legs',
    };
  }
  const controls = { ...aircraft.controls, ...deviceControls(aircraft, devices) };
  const session = createSession(aircraft, {
    devices,
    phase: procedureOf(aircraft, first).startPhase,
  });
  for (const id of legs) {
    session.startLeg(id);
    const result = walkChecklist(session, aircraft, controls, id, options);
    if (!result.ok) return result;
  }
  return { ok: true };
}

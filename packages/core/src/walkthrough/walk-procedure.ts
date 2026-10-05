import type { Aircraft, ControlDefinition, Device, ProcedureItem } from '../contract';
import { deviceControls } from '../devices';
import { procedureOf } from '../phases';
import { STEP_MS } from '../runtime';
import { createSession } from '../session';
import type { Session, SessionControlResult } from '../session';

export const MAX_STEPS = 2000;

export type WalkOptions = { readonly devices?: readonly Device[] };

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

function rejection(result: SessionControlResult): string | undefined {
  if (result.applied || result.reason === 'unchanged') return undefined;
  return result.reason === 'failed' ? 'runtime failed' : `control ${result.reason}`;
}

function progressed(session: Session, index: number): boolean {
  const checklist = session.checklist();
  return checklist === undefined || checklist.done || checklist.current !== index;
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
  const released = definition?.kind === 'momentary' && !pressed;
  const result = released
    ? session.release(control)
    : pressed
      ? session.press(control, definition?.kind === 'momentary' ? undefined : position)
      : session.set(control, position);
  const rejected = rejection(result);
  if (rejected) return rejected;

  const held =
    item.holdUntil === undefined || advanceUntil(session, () => progressed(session, index));
  if (pressed) session.release(control);
  return held ? undefined : `hold condition not met within ${MAX_STEPS} steps`;
}

function perform(
  session: Session,
  definition: ControlDefinition | undefined,
  item: Item,
  index: number,
): string | undefined {
  if (item.type === 'action') return performAction(session, definition, item, index);
  if (item.type === 'check') {
    if (!advanceUntil(session, () => item.condition(session.state()))) {
      return 'condition not met';
    }
  }
  session.checkOff();
  return undefined;
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

  const fail = (itemIndex: number, reason: string): WalkResult => ({
    ok: false,
    aircraft: aircraft.id,
    procedure: procedureId,
    itemIndex,
    item: procedure.items[itemIndex]?.text.en ?? '',
    reason,
  });

  for (let checklist = session.checklist(); checklist && !checklist.done;) {
    const index = checklist.current;
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
    if (reason !== undefined) return fail(index, reason);
    checklist = session.checklist();
  }

  const deviation = session.checklist()?.deviations[0];
  if (deviation) {
    const named = deviation.controlId === undefined ? '' : ` ${deviation.controlId}`;
    return fail(deviation.itemIndex, `${deviation.kind}${named}`);
  }
  return { ok: true };
}

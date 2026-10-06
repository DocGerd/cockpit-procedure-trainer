import { STEP_MS, createSession } from '@cpt/core';
import type { Aircraft, ControlDefinition, ProcedureItem, Session } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { ctslAircraft } from '../index';
import { testDevices } from '../test-devices';

const MAX_STEPS = 2000;

type Item = ProcedureItem<unknown>;

const springBackOf = (definition: ControlDefinition | undefined) =>
  definition?.kind === 'rotary' ? definition.springBack : undefined;

const usesSpring = (aircraft: Aircraft, item: Item) =>
  item.type === 'action' &&
  springBackOf(aircraft.controls[item.control]) !== undefined &&
  Object.hasOwn(springBackOf(aircraft.controls[item.control]) ?? {}, String(item.position));

const advanceUntil = (session: Session, done: () => boolean) => {
  for (let steps = 0; !done(); steps++) {
    if (steps >= MAX_STEPS) return false;
    session.advance(STEP_MS);
  }
  return true;
};

// The panel only offers a spring detent while the control rests at the position it springs back
// to, so a spring action is performable only from there.
function walkListedActions(aircraft: Aircraft, id: string): string | undefined {
  const procedure = aircraft.procedures[id];
  if (!procedure) return `no procedure ${id}`;
  const session = createSession(aircraft, { devices: testDevices, phase: procedure.startPhase });
  session.startProcedure(id);
  for (let checklist = session.checklist(); checklist && !checklist.done;) {
    const index = checklist.current;
    const item = procedure.items[index] as Item;
    if (item.type === 'confirm') session.checkOff();
    else if (item.type === 'check') {
      if (!advanceUntil(session, () => item.condition(session.state()))) {
        return `item ${index} "${item.text.en}": condition not met`;
      }
      session.checkOff();
    } else {
      const spring = springBackOf(aircraft.controls[item.control]);
      if (session.guards()[item.control] === 'closed') session.openGuard(item.control);
      if (spring !== undefined && usesSpring(aircraft, item)) {
        const at = session.state().controls[item.control];
        const resting = spring[String(item.position)];
        if (at !== resting) {
          return `item ${index} "${item.text.en}": ${item.control} is at ${String(at)}, a hold to ${String(item.position)} needs it at ${String(resting)}`;
        }
        session.press(item.control, item.position as string);
        const held =
          item.holdUntil === undefined ||
          advanceUntil(session, () => session.checklist()?.current !== index);
        session.release(item.control);
        if (!held) return `item ${index} "${item.text.en}": hold condition not met`;
      } else if (aircraft.controls[item.control]?.kind === 'momentary') {
        if (item.position === aircraft.controls[item.control]?.positions[1]) {
          session.press(item.control);
          const held =
            item.holdUntil === undefined ||
            advanceUntil(session, () => session.checklist()?.current !== index);
          session.release(item.control);
          if (!held) return `item ${index} "${item.text.en}": hold condition not met`;
        } else session.release(item.control);
      } else {
        session.set(item.control, item.position);
      }
    }
    const next = session.checklist();
    if (next && !next.done && next.current === index) {
      return `item ${index} "${item.text.en}": did not complete`;
    }
    checklist = next;
  }
  return undefined;
}

const springProcedures = Object.entries(ctslAircraft.procedures)
  .filter(([, procedure]) =>
    (procedure.items as readonly Item[]).some((item) => usesSpring(ctslAircraft, item)),
  )
  .map(([id]) => id);

const withoutItem = (id: string, index: number): Aircraft => {
  const procedure = ctslAircraft.procedures[id];
  if (!procedure) throw new Error(`no procedure ${id}`);
  return {
    ...ctslAircraft,
    procedures: {
      ...ctslAircraft.procedures,
      [id]: { ...procedure, items: procedure.items.filter((_, i) => i !== index) },
    },
  } as Aircraft;
};

describe('CTSL procedures that use a spring position', () => {
  it('covers the engine start and the in-flight restart', () => {
    expect(springProcedures).toEqual(
      expect.arrayContaining(['engineStart', 'engineFailureRestart']),
    );
  });

  it.each(springProcedures)('%s is completed by its listed actions alone', (id) => {
    expect(walkListedActions(ctslAircraft, id)).toBeUndefined();
  });

  it('engineStart needs its ignition BOTH step because the engine starts with the key off', () => {
    const items = (ctslAircraft.procedures.engineStart?.items ?? []) as readonly Item[];
    const toBoth = items.findIndex(
      (item) => item.type === 'action' && item.control === 'ignition' && item.position === 'both',
    );
    expect(toBoth).toBeGreaterThanOrEqual(0);
    expect(walkListedActions(withoutItem('engineStart', toBoth), 'engineStart')).toMatch(
      /needs it at both/,
    );
  });
});

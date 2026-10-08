import { describe, expect, it } from 'vitest';
import type { ControlChange, Positions, ProcedureDefinition, TrainerState } from '../contract';
import { fixtureAircraft } from '../contract/fixtures';
import type { FixtureState } from '../contract/fixtures';
import { checkOff, observeControl, observeState, startChecklist, takesTick } from './checklist';

function procedureOf(id: string): ProcedureDefinition<FixtureState> {
  const procedure = fixtureAircraft.procedures[id];
  if (!procedure) throw new Error(`fixture has no procedure ${id}`);
  return procedure;
}

const controls = fixtureAircraft.controls;
const beforeStart = procedureOf('beforeStart');
const alternatorFailure = procedureOf('alternatorFailure');

const parking: Positions = {
  master: 'off',
  ignition: 'off',
  throttle: 0,
  flaps: 'up',
  lampTest: 'released',
  fuelPump: 'off',
  alternatorBreaker: 'in',
};

const idle: FixtureState = {
  busPowered: false,
  starterMs: 0,
  engineRunning: false,
  volts: 0,
  rpm: 0,
};

function stateOf(
  controls: Positions = {},
  systems: Partial<FixtureState> = {},
): TrainerState<FixtureState> {
  return {
    controls: { ...parking, ...controls },
    systems: { ...idle, ...systems },
    devices: {},
  };
}

const position = (
  id: string,
  from: string | number,
  to: string | number,
  source: ControlChange['source'] = 'pilot',
): ControlChange => ({ id, source, kind: 'position', from, to });

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

const begin = (procedure: ProcedureDefinition<FixtureState> = beforeStart) =>
  startChecklist(procedure, stateOf(), controls);

const masterOn = stateOf({ master: 'on' }, { busPowered: true, volts: 12 });
const pumpOn = stateOf({ master: 'on', fuelPump: 'on' }, { busPowered: true, volts: 12 });
const cranking = stateOf({ master: 'on', fuelPump: 'on', ignition: 'start' }, { busPowered: true });
const running = stateOf(
  { master: 'on', fuelPump: 'on', ignition: 'start' },
  { busPowered: true, engineRunning: true, rpm: 700 },
);
const released = stateOf(
  { master: 'on', fuelPump: 'on', ignition: 'both' },
  { busPowered: true, engineRunning: true, rpm: 700 },
);

function atConfirm() {
  let checklist = begin();
  checklist = observeControl(checklist, position('master', 'off', 'on'), masterOn);
  checklist = observeControl(checklist, position('fuelPump', 'off', 'on'), pumpOn);
  return checkOff(checklist, pumpOn);
}

const magnetosOn = stateOf(
  { master: 'on', fuelPump: 'on', ignition: 'both' },
  { busPowered: true },
);

function atStarter() {
  const confirmed = checkOff(atConfirm(), pumpOn);
  return observeControl(confirmed, position('ignition', 'off', 'both'), magnetosOn);
}

describe('startChecklist', () => {
  it('starts at the first item with nothing completed', () => {
    const checklist = begin();
    expect(checklist.current).toBe(0);
    expect(checklist.completed).toEqual([]);
    expect(checklist.deviations).toEqual([]);
    expect(checklist.done).toBe(false);
  });

  it('is done at once for a procedure without items', () => {
    expect(begin({ ...beforeStart, items: [] }).done).toBe(true);
  });

  it('stops at a leading action whose target already holds, for the pilot to verify', () => {
    const checklist = startChecklist(beforeStart, pumpOn, controls);
    expect(checklist.completed).toEqual([]);
    expect(checklist.current).toBe(0);
    expect(checklist.deviations).toEqual([]);
  });
});

describe('action items', () => {
  it('complete when the target reaches the position', () => {
    const checklist = observeControl(begin(), position('master', 'off', 'on'), masterOn);
    expect(checklist.completed).toEqual([0]);
    expect(checklist.current).toBe(1);
    expect(checklist.deviations).toEqual([]);
  });

  it('stay current while the target is at another position', () => {
    const detent = stateOf({ master: 'on', fuelPump: 'on', ignition: 'off' });
    const checklist = observeControl(atStarter(), position('ignition', 'both', 'off'), detent);
    expect(checklist.current).toBe(5);
    expect(checklist.completed).not.toContain(5);
    expect(checklist.deviations).toEqual([]);
  });

  it('do not complete from observed state alone', () => {
    const checklist = observeState(begin(), masterOn);
    expect(checklist.completed).toEqual([]);
    expect(checklist.current).toBe(0);
  });

  it('complete with a verify tick while the target already holds', () => {
    let checklist = startChecklist(beforeStart, pumpOn, controls);
    checklist = checkOff(checklist, pumpOn);
    expect(checklist.completed).toEqual([0]);
    expect(checklist.current).toBe(1);
    checklist = checkOff(checklist, pumpOn);
    expect(checklist.completed).toEqual([0, 1]);
    expect(checklist.current).toBe(2);
    expect(checklist.deviations).toEqual([]);
  });

  it('complete when the pilot operates a target that already held', () => {
    let checklist = startChecklist(beforeStart, masterOn, controls);
    checklist = observeControl(checklist, position('master', 'on', 'off'), stateOf());
    expect(checklist.current).toBe(0);
    checklist = observeControl(checklist, position('master', 'off', 'on'), masterOn);
    expect(checklist.completed).toEqual([0]);
    expect(checklist.deviations).toEqual([]);
  });

  it('record a wrong position for a verify tick while the target is elsewhere, and still complete', () => {
    const checklist = checkOff(begin(), stateOf());
    expect(checklist.completed).toEqual([0]);
    expect(checklist.current).toBe(1);
    expect(checklist.deviations).toEqual([
      { kind: 'wrong-position', itemIndex: 0, controlId: 'master', position: 'off' },
    ]);
  });

  it('ignore a verify tick on a spring-back action', () => {
    const checklist = atStarter();
    expect(checklist.current).toBe(5);
    expect(checkOff(checklist, magnetosOn)).toBe(checklist);
  });

  it('ignore a verify tick on a momentary press', () => {
    const procedure: ProcedureDefinition<FixtureState> = {
      ...beforeStart,
      items: [
        { type: 'action', control: 'lampTest', position: 'pressed', text: { de: 'x', en: 'x' } },
      ],
    };
    const checklist = startChecklist(procedure, stateOf(), controls);
    expect(takesTick(checklist)).toBe(false);
    expect(checkOff(checklist, stateOf())).toBe(checklist);
  });

  it('complete a holdUntil action at once on a verify tick while the target is elsewhere', () => {
    const procedure: ProcedureDefinition<FixtureState> = {
      ...beforeStart,
      items: [
        {
          type: 'action',
          control: 'master',
          position: 'on',
          holdUntil: () => false,
          text: { de: 'x', en: 'x' },
        },
      ],
    };
    const checklist = checkOff(startChecklist(procedure, stateOf(), controls), stateOf());
    expect(checklist.done).toBe(true);
    expect(checklist.deviations).toEqual([
      { kind: 'wrong-position', itemIndex: 0, controlId: 'master', position: 'off' },
    ]);
  });

  it('with holdUntil still wait for the condition after a verify tick', () => {
    const procedure: ProcedureDefinition<FixtureState> = {
      ...beforeStart,
      items: [
        {
          type: 'action',
          control: 'master',
          position: 'on',
          holdUntil: (state: TrainerState<FixtureState>) => state.systems.volts > 0,
          text: { de: 'x', en: 'x' },
        },
      ],
    };
    const dark = stateOf({ master: 'on' });
    let checklist = checkOff(startChecklist(procedure, dark, controls), dark);
    expect(checklist.done).toBe(false);
    checklist = observeState(checklist, masterOn);
    expect(checklist.done).toBe(true);
    expect(checklist.deviations).toEqual([]);
  });

  it('with holdUntil complete only once the condition also holds', () => {
    let checklist = atStarter();
    expect(checklist.current).toBe(5);

    checklist = observeControl(checklist, position('ignition', 'both', 'start'), cranking);
    expect(checklist.current).toBe(5);

    checklist = observeState(checklist, cranking);
    expect(checklist.current).toBe(5);

    checklist = observeState(checklist, running);
    expect(checklist.completed).toContain(5);
    expect(checklist.current).toBe(6);
  });

  it('with holdUntil do not complete when the target was released first', () => {
    let checklist = atStarter();
    checklist = observeControl(checklist, position('ignition', 'both', 'start'), cranking);
    const letGo = stateOf({ master: 'on', fuelPump: 'on', ignition: 'both' });
    checklist = observeControl(checklist, position('ignition', 'start', 'both', 'spring'), letGo);
    checklist = observeState(checklist, released);
    expect(checklist.current).toBe(5);
  });

  it('stop at an item done early, recorded out of order, until the pilot verifies it', () => {
    let checklist = observeControl(
      begin(),
      position('fuelPump', 'off', 'on'),
      stateOf({ fuelPump: 'on' }),
    );
    expect(checklist.deviations).toEqual([
      { kind: 'out-of-order', itemIndex: 0, controlId: 'fuelPump', laterItem: 1 },
    ]);
    expect(checklist.completed).toEqual([]);

    checklist = observeControl(checklist, position('master', 'off', 'on'), pumpOn);
    expect(checklist.completed).toEqual([0]);
    expect(checklist.current).toBe(1);

    checklist = checkOff(checklist, pumpOn);
    expect(checklist.completed).toEqual([0, 1]);
    expect(checklist.current).toBe(2);
    expect(checklist.deviations).toHaveLength(1);
  });
});

describe('check and confirm items', () => {
  it('complete when checked off and not before', () => {
    let checklist = observeControl(begin(), position('master', 'off', 'on'), masterOn);
    checklist = observeControl(checklist, position('fuelPump', 'off', 'on'), pumpOn);
    expect(checklist.current).toBe(2);
    expect(observeState(checklist, pumpOn).current).toBe(2);

    checklist = checkOff(checklist, pumpOn);
    expect(checklist.completed).toEqual([0, 1, 2]);
    expect(checklist.current).toBe(3);
    expect(checklist.deviations).toEqual([]);

    checklist = checkOff(checklist, pumpOn);
    expect(checklist.completed).toEqual([0, 1, 2, 3]);
    expect(checklist.current).toBe(4);
    expect(checklist.deviations).toEqual([]);
  });

  it('record a deviation for a check-off with an unmet condition, and still complete', () => {
    let checklist = observeControl(begin(), position('master', 'off', 'on'), masterOn);
    checklist = observeControl(checklist, position('fuelPump', 'off', 'on'), pumpOn);
    checklist = checkOff(checklist, stateOf());
    expect(checklist.completed).toEqual([0, 1, 2]);
    expect(checklist.current).toBe(3);
    expect(checklist.deviations).toEqual([{ kind: 'unmet-check', itemIndex: 2 }]);
  });

  it('record no deviation when checking off a confirm item', () => {
    const checklist = checkOff(atConfirm(), stateOf());
    expect(checklist.completed).toEqual([0, 1, 2, 3]);
    expect(checklist.deviations).toEqual([]);
  });

  it('finish the procedure when the last item completes', () => {
    let checklist = observeControl(atStarter(), position('ignition', 'both', 'start'), running);
    expect(checklist.current).toBe(6);
    checklist = checkOff(checklist, running);
    expect(checklist.done).toBe(true);
    expect(checklist.completed).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(checklist.deviations).toEqual([]);
  });
});

describe('deviations', () => {
  it('record a pilot position change to a control that is not the current target', () => {
    const checklist = observeControl(
      begin(),
      position('throttle', 0, 0.5),
      stateOf({ throttle: 0.5 }),
    );
    expect(checklist.deviations).toEqual([
      { kind: 'unexpected-control', itemIndex: 0, controlId: 'throttle' },
    ]);
    expect(checklist.current).toBe(0);
  });

  it('record a move of a later item target to its position as out of order', () => {
    const checklist = observeControl(
      begin(),
      position('ignition', 'off', 'both'),
      stateOf({ ignition: 'both' }),
    );
    expect(checklist.deviations).toEqual([
      { kind: 'out-of-order', itemIndex: 0, controlId: 'ignition', laterItem: 4 },
    ]);
    expect(checklist.current).toBe(0);
  });

  it('record a move of a later item target to another position as unexpected', () => {
    const checklist = observeControl(
      begin(),
      position('ignition', 'off', 'right'),
      stateOf({ ignition: 'right' }),
    );
    expect(checklist.deviations).toEqual([
      { kind: 'unexpected-control', itemIndex: 0, controlId: 'ignition' },
    ]);
  });

  it('record a wrong position when the pilot leaves the target for another control', () => {
    const magnetoRight = stateOf({ master: 'on', fuelPump: 'on', ignition: 'right' });
    let checklist = checkOff(atConfirm(), pumpOn);
    checklist = observeControl(checklist, position('ignition', 'off', 'right'), magnetoRight);
    expect(checklist.deviations).toEqual([]);
    checklist = observeControl(checklist, position('flaps', 'up', 'takeoff'), magnetoRight);
    expect(checklist.deviations).toEqual([
      { kind: 'wrong-position', itemIndex: 4, controlId: 'ignition', position: 'right' },
      { kind: 'unexpected-control', itemIndex: 4, controlId: 'flaps' },
    ]);
    checklist = observeControl(checklist, position('flaps', 'takeoff', 'up'), magnetoRight);
    expect(checklist.deviations.filter(({ kind }) => kind === 'wrong-position')).toHaveLength(1);
    expect(checklist.current).toBe(4);
  });

  it('record no wrong position when the target is put right before moving on', () => {
    const magnetoRight = stateOf({ master: 'on', fuelPump: 'on', ignition: 'right' });
    let checklist = checkOff(atConfirm(), pumpOn);
    checklist = observeControl(checklist, position('ignition', 'off', 'right'), magnetoRight);
    checklist = observeControl(checklist, position('ignition', 'right', 'both'), magnetosOn);
    checklist = observeControl(checklist, position('flaps', 'up', 'takeoff'), magnetosOn);
    expect(checklist.deviations).toEqual([
      { kind: 'unexpected-control', itemIndex: 5, controlId: 'flaps' },
    ]);
  });

  it('record no wrong position for a target the pilot never moved', () => {
    const checklist = observeControl(begin(), position('flaps', 'up', 'takeoff'), stateOf());
    expect(checklist.deviations).toEqual([
      { kind: 'unexpected-control', itemIndex: 0, controlId: 'flaps' },
    ]);
  });

  it('record deviations against the item that is current at the time', () => {
    let checklist = observeControl(begin(), position('master', 'off', 'on'), masterOn);
    checklist = observeControl(checklist, position('flaps', 'up', 'takeoff'), masterOn);
    expect(checklist.deviations).toEqual([
      { kind: 'unexpected-control', itemIndex: 1, controlId: 'flaps' },
    ]);
  });

  it('record a deviation against the item that was current before the change completed it', () => {
    const throttled = stateOf(
      { master: 'on', fuelPump: 'on', ignition: 'start', throttle: 0.5 },
      { busPowered: true, engineRunning: true, rpm: 1500 },
    );
    const cranked = observeControl(atStarter(), position('ignition', 'both', 'start'), cranking);
    const checklist = observeControl(cranked, position('throttle', 0, 0.5), throttled);
    expect(checklist.completed).toContain(5);
    expect(checklist.current).toBe(6);
    expect(checklist.deviations).toEqual([
      { kind: 'unexpected-control', itemIndex: 5, controlId: 'throttle' },
    ]);
  });

  it('record a pilot position change while a confirm item is current', () => {
    const checklist = observeControl(atConfirm(), position('flaps', 'up', 'landing'), pumpOn);
    expect(checklist.deviations).toEqual([
      { kind: 'unexpected-control', itemIndex: 3, controlId: 'flaps' },
    ]);
  });

  it('record a pilot position change while an indicator check is current', () => {
    let checklist = observeControl(begin(), position('master', 'off', 'on'), masterOn);
    checklist = observeControl(checklist, position('fuelPump', 'off', 'on'), pumpOn);
    checklist = observeControl(checklist, position('flaps', 'up', 'landing'), pumpOn);
    expect(checklist.deviations).toEqual([
      { kind: 'unexpected-control', itemIndex: 2, controlId: 'flaps' },
    ]);
  });

  it('accept a pilot change to the control a check targets', () => {
    const checklist = startChecklist(alternatorFailure, stateOf(), controls);
    const next = observeControl(
      checklist,
      position('alternatorBreaker', 'in', 'pulled'),
      stateOf({ alternatorBreaker: 'pulled' }),
    );
    expect(next.deviations).toEqual([]);
  });

  it('leave a wrong digit on the current target pending without a deviation', () => {
    const code: ProcedureDefinition<FixtureState> = {
      title: { de: 'Code', en: 'Code' },
      type: 'normal',
      startPhase: 'parked',
      items: [
        { type: 'action', control: 'xpdr.code1', position: '1', text: { de: 'x', en: 'x' } },
        { type: 'action', control: 'xpdr.code2', position: '2', text: { de: 'x', en: 'x' } },
      ],
    };
    let checklist = startChecklist(code, stateOf({ 'xpdr.code1': '0' }), {});
    for (const [from, to] of [
      ['0', '7'],
      ['7', '3'],
    ] as const) {
      checklist = observeControl(
        checklist,
        position('xpdr.code1', from, to),
        stateOf({ 'xpdr.code1': to }),
      );
      expect(checklist.deviations).toEqual([]);
      expect(checklist.current).toBe(0);
    }
    checklist = observeControl(
      checklist,
      position('xpdr.code1', '3', '1'),
      stateOf({ 'xpdr.code1': '1' }),
    );
    expect(checklist.completed).toEqual([0]);
    expect(checklist.current).toBe(1);
    expect(checklist.deviations).toEqual([]);
  });

  it('record a wrong digit left behind when the pilot moves on to the next digit', () => {
    const code: ProcedureDefinition<FixtureState> = {
      title: { de: 'Code', en: 'Code' },
      type: 'normal',
      startPhase: 'parked',
      items: [
        { type: 'action', control: 'xpdr.code1', position: '1', text: { de: 'x', en: 'x' } },
        { type: 'action', control: 'xpdr.code2', position: '2', text: { de: 'x', en: 'x' } },
      ],
    };
    let checklist = startChecklist(code, stateOf({ 'xpdr.code1': '0', 'xpdr.code2': '0' }), {});
    checklist = observeControl(
      checklist,
      position('xpdr.code1', '0', '3'),
      stateOf({ 'xpdr.code1': '3', 'xpdr.code2': '0' }),
    );
    checklist = observeControl(
      checklist,
      position('xpdr.code2', '0', '2'),
      stateOf({ 'xpdr.code1': '3', 'xpdr.code2': '2' }),
    );
    expect(checklist.deviations).toEqual([
      { kind: 'wrong-position', itemIndex: 0, controlId: 'xpdr.code1', position: '3' },
      { kind: 'out-of-order', itemIndex: 0, controlId: 'xpdr.code2', laterItem: 1 },
    ]);
  });

  it('never record spring changes, such as a released starter', () => {
    let checklist = observeControl(atStarter(), position('ignition', 'both', 'start'), running);
    expect(checklist.current).toBe(6);
    checklist = observeControl(
      checklist,
      position('ignition', 'start', 'both', 'spring'),
      released,
    );
    expect(checklist.deviations).toEqual([]);
  });

  it('never record system changes', () => {
    const change = position('alternatorBreaker', 'in', 'pulled', 'system');
    expect(observeControl(begin(), change, stateOf()).deviations).toEqual([]);
  });

  it('never record guard moves', () => {
    const guard: ControlChange = {
      id: 'fuelPump',
      source: 'pilot',
      kind: 'guard',
      from: 'closed',
      to: 'open',
    };
    expect(observeControl(begin(), guard, stateOf()).deviations).toEqual([]);
  });

  it('record nothing once the procedure is done', () => {
    const done = begin({ ...beforeStart, items: [] });
    const change = position('throttle', 0, 1);
    expect(observeControl(done, change, stateOf({ throttle: 1 }))).toBe(done);
    expect(checkOff(done, stateOf())).toBe(done);
  });
});

describe('one drag of a continuous control', () => {
  const drag = (checklist: ReturnType<typeof begin>, from: number, to: number, steps: number) => {
    let next = checklist;
    let previous = from;
    for (let step = 1; step <= steps; step += 1) {
      const value = from + ((to - from) * step) / steps;
      next = observeControl(
        next,
        position('throttle', previous, value),
        stateOf({ throttle: value }),
      );
      previous = value;
    }
    return next;
  };
  const throttleDeviation = { kind: 'unexpected-control', itemIndex: 0, controlId: 'throttle' };

  it('records one deviation for twenty successive sets', () => {
    expect(drag(begin(), 0, 1, 20).deviations).toEqual([throttleDeviation]);
  });

  it('records again once another control changed in between', () => {
    let checklist = drag(begin(), 0, 0.5, 5);
    checklist = observeControl(checklist, position('flaps', 'up', 'takeoff'), stateOf());
    checklist = drag(checklist, 0.5, 1, 5);
    expect(checklist.deviations).toEqual([
      throttleDeviation,
      { kind: 'unexpected-control', itemIndex: 0, controlId: 'flaps' },
      throttleDeviation,
    ]);
  });

  it('records again once the current item changed in between', () => {
    let checklist = drag(begin(), 0, 0.5, 5);
    checklist = observeControl(checklist, position('master', 'off', 'on'), masterOn);
    checklist = drag(checklist, 0.5, 1, 5);
    expect(checklist.deviations).toEqual([
      throttleDeviation,
      { ...throttleDeviation, itemIndex: 1 },
    ]);
  });

  it('clears the repeating flag when the item completes', () => {
    const checklist = checkOff(drag(atConfirm(), 0, 0.5, 5), pumpOn);
    expect(checklist.repeating).toBe(false);
  });

  it('does not coalesce into a deviation recorded for another item', () => {
    const first = drag(atConfirm(), 0, 0.5, 5);
    const moved = { ...first, current: first.current + 1 };
    const next = observeControl(moved, position('throttle', 0.5, 1), stateOf({ throttle: 1 }));
    expect(next.deviations).toHaveLength(2);
  });

  it('records again after a check-off between two drags', () => {
    let checklist = drag(atConfirm(), 0, 0.5, 5);
    checklist = checkOff(checklist, pumpOn);
    checklist = drag(checklist, 0.5, 1, 5);
    expect(checklist.deviations).toEqual([
      { ...throttleDeviation, itemIndex: 3 },
      { ...throttleDeviation, itemIndex: 4 },
    ]);
  });
});

describe('a drag that ends on a later item target', () => {
  it('records one out-of-order deviation', () => {
    const procedure: ProcedureDefinition<FixtureState> = {
      ...beforeStart,
      items: [
        { type: 'action', control: 'master', position: 'on', text: { de: 'x', en: 'x' } },
        { type: 'action', control: 'throttle', position: 1, text: { de: 'x', en: 'x' } },
      ],
    };
    let checklist = startChecklist(procedure, stateOf(), controls);
    for (const [from, to] of [
      [0, 0.5],
      [0.5, 1],
    ] as const) {
      checklist = observeControl(
        checklist,
        position('throttle', from, to),
        stateOf({ throttle: to }),
      );
    }
    expect(checklist.deviations).toEqual([
      { kind: 'out-of-order', itemIndex: 0, controlId: 'throttle', laterItem: 1 },
    ]);
  });

  it('records one unexpected deviation for a drag that passes the later target and ends elsewhere', () => {
    const procedure: ProcedureDefinition<FixtureState> = {
      ...beforeStart,
      items: [
        { type: 'action', control: 'master', position: 'on', text: { de: 'x', en: 'x' } },
        { type: 'action', control: 'throttle', position: 0.5, text: { de: 'x', en: 'x' } },
      ],
    };
    let checklist = startChecklist(procedure, stateOf(), controls);
    for (const [from, to] of [
      [0, 0.5],
      [0.5, 0.7],
    ] as const) {
      checklist = observeControl(
        checklist,
        position('throttle', from, to),
        stateOf({ throttle: to }),
      );
    }
    expect(checklist.deviations).toEqual([
      { kind: 'unexpected-control', itemIndex: 0, controlId: 'throttle' },
    ]);
  });
});

describe('a check with a response', () => {
  const rpmCheck: ProcedureDefinition<FixtureState> = {
    ...beforeStart,
    items: [
      {
        type: 'check',
        target: { indicator: 'rpm' },
        condition: (state: TrainerState<FixtureState>) => state.systems.rpm > 500,
        response: {
          reading: (state: TrainerState<FixtureState>) => state.systems.rpm,
          tolerance: 50,
        },
        text: { de: 'Drehzahl', en: 'Rpm' },
      },
    ],
  };
  const idling = stateOf({}, { rpm: 700 });
  const start = () => startChecklist(rpmCheck, idling, controls);

  it('completes without a deviation for a reading within tolerance', () => {
    const checklist = checkOff(start(), idling, 740);
    expect(checklist.done).toBe(true);
    expect(checklist.deviations).toEqual([]);
  });

  it('records an unmet check with the reading given when it is outside tolerance', () => {
    const checklist = checkOff(start(), idling, 4000);
    expect(checklist.done).toBe(true);
    expect(checklist.deviations).toEqual([{ kind: 'unmet-check', itemIndex: 0, response: 4000 }]);
  });

  it('judges the condition alone without a reading', () => {
    expect(checkOff(start(), idling).deviations).toEqual([]);
    expect(checkOff(start(), stateOf({}, { rpm: 100 })).deviations).toEqual([
      { kind: 'unmet-check', itemIndex: 0 },
    ]);
  });

  it('keeps a reading of zero', () => {
    expect(checkOff(start(), idling, 0).deviations).toEqual([
      { kind: 'unmet-check', itemIndex: 0, response: 0 },
    ]);
  });

  it('records an unmet check for a reading that is not a number', () => {
    expect(checkOff(start(), idling, Number.NaN).deviations).toHaveLength(1);
  });
});

describe('one operation of a held control', () => {
  // The fixture's start detent is also the target of item 5, so pressing it early is out of order.
  const cases = [
    ['a momentary control', 'lampTest', 'released', 'pressed', 'released', {}],
    [
      'a spring-back detent',
      'ignition',
      'off',
      'start',
      'both',
      { kind: 'out-of-order', laterItem: 5 },
    ],
  ] as const;

  for (const [name, control, initial, detent, rest, kind] of cases) {
    const deviation = { kind: 'unexpected-control', itemIndex: 0, controlId: control, ...kind };

    it(`records one deviation for the press and release of ${name}`, () => {
      const held = stateOf({ [control]: detent });
      const letGo = stateOf({ [control]: rest });
      let checklist = observeControl(begin(), position(control, initial, detent), held);
      checklist = observeControl(checklist, position(control, detent, rest, 'spring'), letGo);
      expect(checklist.deviations).toEqual([deviation]);
    });

    it(`records a second deviation for a separate press of ${name}`, () => {
      const held = stateOf({ [control]: detent });
      const letGo = stateOf({ [control]: rest });
      let checklist = observeControl(begin(), position(control, initial, detent), held);
      checklist = observeControl(checklist, position(control, detent, rest, 'spring'), letGo);
      checklist = observeControl(checklist, position(control, rest, detent), held);
      checklist = observeControl(checklist, position(control, detent, rest, 'spring'), letGo);
      expect(checklist.deviations).toEqual([deviation, deviation]);
    });
  }
});

describe('consecutive spring-back actions', () => {
  const press = (control: string, position: string, extra = {}) =>
    ({
      type: 'action',
      control,
      position,
      text: { de: 'Drücken', en: 'Press' },
      ...extra,
    }) as const;
  const twice = (control: string, position: string, rest: string) => {
    const procedure: ProcedureDefinition<FixtureState> = {
      ...beforeStart,
      items: [press(control, position), press(control, position)],
    };
    const held = stateOf({ [control]: position });
    const letGo = stateOf({ [control]: rest });
    return { procedure, held, letGo };
  };
  const cases = [
    ['a momentary control', 'lampTest', 'pressed', 'released'],
    ['a spring-back detent', 'ignition', 'start', 'both'],
  ] as const;

  for (const [name, control, detent, rest] of cases) {
    it(`need one press per item on ${name}`, () => {
      const { procedure, held, letGo } = twice(control, detent, rest);
      let checklist = startChecklist(procedure, letGo, controls);
      checklist = observeControl(checklist, position(control, rest, detent), held);
      expect(checklist.completed).toEqual([0]);
      expect(checklist.current).toBe(1);

      checklist = observeState(checklist, held);
      expect(checklist.current).toBe(1);

      checklist = observeControl(checklist, position(control, detent, rest, 'spring'), letGo);
      expect(checklist.current).toBe(1);

      checklist = observeControl(checklist, position(control, rest, detent), held);
      expect(checklist.done).toBe(true);
      expect(checklist.completed).toEqual([0, 1]);
      expect(checklist.deviations).toEqual([]);
    });
  }

  it('do not complete from a control already held when the checklist starts', () => {
    const { procedure, held } = twice('ignition', 'start', 'both');
    const checklist = startChecklist(procedure, held, controls);
    expect(checklist.completed).toEqual([]);
    expect(checklist.current).toBe(0);
  });

  it('ignore a press that happened before the item became current', () => {
    const procedure: ProcedureDefinition<FixtureState> = {
      ...beforeStart,
      items: [{ type: 'confirm', text: { de: 'Frei', en: 'Clear' } }, press('ignition', 'start')],
    };
    const held = stateOf({ ignition: 'start' });
    let checklist = startChecklist(procedure, stateOf(), controls);
    checklist = observeControl(checklist, position('ignition', 'both', 'start'), held);
    checklist = checkOff(checklist, held);
    expect(checklist.current).toBe(1);
    expect(observeState(checklist, held).current).toBe(1);
  });

  it('ignore a move that is not a pilot press of the detent', () => {
    const procedure: ProcedureDefinition<FixtureState> = {
      ...beforeStart,
      items: [press('ignition', 'start')],
    };
    const held = stateOf({ ignition: 'start' });
    const start = () => startChecklist(procedure, stateOf(), controls);

    const system = observeControl(start(), position('ignition', 'both', 'start', 'system'), held);
    expect(system.current).toBe(0);
    expect(observeState(system, held).current).toBe(0);

    const other = observeControl(start(), position('ignition', 'off', 'both'), stateOf());
    expect(observeState(other, held).current).toBe(0);
  });

  it('count a press made while a hold condition is still unmet', () => {
    const procedure: ProcedureDefinition<FixtureState> = {
      ...beforeStart,
      items: [
        press('ignition', 'start', {
          holdUntil: (state: TrainerState<FixtureState>) => state.systems.engineRunning,
        }),
      ],
    };
    let checklist = startChecklist(procedure, stateOf(), controls);
    checklist = observeControl(checklist, position('ignition', 'both', 'start'), cranking);
    expect(checklist.current).toBe(0);
    checklist = observeState(checklist, running);
    expect(checklist.done).toBe(true);
  });

  it('need a verify tick for a rest position that already holds', () => {
    const procedure: ProcedureDefinition<FixtureState> = {
      ...beforeStart,
      items: [press('lampTest', 'released')],
    };
    const checklist = startChecklist(procedure, stateOf(), controls);
    expect(checklist.done).toBe(false);
    expect(checkOff(checklist, stateOf()).done).toBe(true);
  });
});

describe('purity', () => {
  it('never alters its inputs', () => {
    const procedure = deepFreeze({ ...beforeStart, items: [...beforeStart.items] });
    const state = deepFreeze(masterOn);
    const change = deepFreeze(position('master', 'off', 'on'));

    const started = deepFreeze(startChecklist(procedure, stateOf(), controls));
    const moved = deepFreeze(observeControl(started, change, state));
    deepFreeze(observeState(moved, pumpOn));
    deepFreeze(checkOff(moved, pumpOn));
    expect(started.completed).toEqual([]);
    expect(moved.completed).toEqual([0]);
  });

  it('returns the same checklist when nothing changes', () => {
    const checklist = begin();
    expect(observeState(checklist, stateOf())).toBe(checklist);
  });
});

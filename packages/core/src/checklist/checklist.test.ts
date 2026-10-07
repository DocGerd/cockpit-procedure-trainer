import { describe, expect, it } from 'vitest';
import type { ControlChange, Positions, ProcedureDefinition, TrainerState } from '../contract';
import { fixtureAircraft } from '../contract/fixtures';
import type { FixtureState } from '../contract/fixtures';
import { checkOff, observeControl, observeState, startChecklist } from './checklist';

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

  it('completes leading action items that are already satisfied', () => {
    const checklist = startChecklist(beforeStart, pumpOn, controls);
    expect(checklist.completed).toEqual([0, 1]);
    expect(checklist.current).toBe(2);
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

  it('complete from observed state alone', () => {
    expect(observeState(begin(), masterOn).completed).toEqual([0]);
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

  it('complete at once when already satisfied as they become current', () => {
    let checklist = observeControl(
      begin(),
      position('fuelPump', 'off', 'on'),
      stateOf({ fuelPump: 'on' }),
    );
    expect(checklist.deviations).toEqual([
      { kind: 'unexpected-control', itemIndex: 0, controlId: 'fuelPump' },
    ]);
    expect(checklist.completed).toEqual([]);

    checklist = observeControl(checklist, position('master', 'off', 'on'), pumpOn);
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

  it('ignore checkOff while an action item is current', () => {
    const checklist = begin();
    expect(checkOff(checklist, stateOf())).toBe(checklist);
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

  it('judge a later item target strictly against the current item', () => {
    const checklist = observeControl(
      begin(),
      position('fuelPump', 'off', 'on'),
      stateOf({ fuelPump: 'on' }),
    );
    expect(checklist.deviations).toEqual([
      { kind: 'unexpected-control', itemIndex: 0, controlId: 'fuelPump' },
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

  it('leave a wrong position on the current target pending without a deviation', () => {
    let checklist = checkOff(atConfirm(), pumpOn);
    const target = beforeStart.items[checklist.current];
    expect(target).toMatchObject({ type: 'action', control: 'ignition', position: 'both' });
    for (const [from, to] of [
      ['off', 'right'],
      ['right', 'left'],
    ] as const) {
      checklist = observeControl(
        checklist,
        position('ignition', from, to),
        stateOf({ master: 'on', fuelPump: 'on', ignition: to }, { busPowered: true }),
      );
      expect(checklist.deviations).toEqual([]);
      expect(checklist.completed).not.toContain(4);
    }
    checklist = observeControl(checklist, position('ignition', 'left', 'both'), magnetosOn);
    expect(checklist.completed).toContain(4);
    expect(checklist.deviations).toEqual([]);
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

describe('one operation of a held control', () => {
  const cases = [
    ['a momentary control', 'lampTest', 'released', 'pressed', 'released'],
    ['a spring-back detent', 'ignition', 'off', 'start', 'both'],
  ] as const;

  for (const [name, control, initial, detent, rest] of cases) {
    it(`records one deviation for the press and release of ${name}`, () => {
      const held = stateOf({ [control]: detent });
      const letGo = stateOf({ [control]: rest });
      let checklist = observeControl(begin(), position(control, initial, detent), held);
      checklist = observeControl(checklist, position(control, detent, rest, 'spring'), letGo);
      expect(checklist.deviations).toEqual([
        { kind: 'unexpected-control', itemIndex: 0, controlId: control },
      ]);
    });

    it(`records a second deviation for a separate press of ${name}`, () => {
      const held = stateOf({ [control]: detent });
      const letGo = stateOf({ [control]: rest });
      let checklist = observeControl(begin(), position(control, initial, detent), held);
      checklist = observeControl(checklist, position(control, detent, rest, 'spring'), letGo);
      checklist = observeControl(checklist, position(control, rest, detent), held);
      checklist = observeControl(checklist, position(control, detent, rest, 'spring'), letGo);
      const deviation = { kind: 'unexpected-control', itemIndex: 0, controlId: control };
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

  it('still complete a rest position from state alone', () => {
    const procedure: ProcedureDefinition<FixtureState> = {
      ...beforeStart,
      items: [press('lampTest', 'released')],
    };
    const checklist = startChecklist(procedure, stateOf(), controls);
    expect(checklist.done).toBe(true);
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

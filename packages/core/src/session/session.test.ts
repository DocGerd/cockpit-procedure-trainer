import { describe, expect, it } from 'vitest';
import type { Aircraft } from '../contract';
import { fixtureAircraft, STARTER_MS_TO_START } from '../contract/fixtures';
import type { FixtureState } from '../contract/fixtures';
import { defineDevice } from '../devices';
import { engineMonitor, fixtureDeviceAircraft, monitorState } from '../devices/fixtures';
import { STEP_MS } from '../runtime';
import { createSession } from './index';
import type { Session } from './index';

const fixturePhase = (id: string) => {
  const phase = fixtureAircraft.phases[id];
  if (!phase) throw new Error(`fixture has no phase ${id}`);
  return phase;
};

const fixtureSystems = (session: Session) => session.state().systems as FixtureState;

function crankUntilRunning(session: Session): void {
  for (let elapsed = 0; elapsed < STARTER_MS_TO_START * 2; elapsed += STEP_MS) {
    if (fixtureSystems(session).engineRunning) return;
    session.advance(STEP_MS);
  }
  throw new Error('engine never started');
}

const fingerprint = (session: Session) => ({
  phase: session.phase(),
  environment: session.environment(),
  state: session.state(),
  guards: session.guards(),
  failures: [...session.failures()],
  status: session.status(),
  procedure: session.procedureId(),
  checklist: session.checklist(),
});

function disturb(session: Session): void {
  session.startProcedure('alternatorFailure');
  session.set('master', 'off');
  session.set('throttle', 0.7);
  session.openGuard('fuelPump');
  session.press('lampTest');
  session.advance(STEP_MS);
}

describe('createSession', () => {
  it('loads the first phase snapshot unless told otherwise', () => {
    const session = createSession(fixtureAircraft);
    expect(session.phase()).toBe('parking');
    expect(session.state().systems).toBe(fixturePhase('parking').entry.state);
    expect(createSession(fixtureAircraft, { phase: 'runup' }).state().controls.master).toBe('on');
  });

  it('throws for an unknown start phase and for an aircraft without phases', () => {
    expect(() => createSession(fixtureAircraft, { phase: 'nowhere' })).toThrow('nowhere');
    expect(() => createSession({ ...fixtureAircraft, phases: {} } as Aircraft)).toThrow(/phases/);
  });

  it('exposes no failures, no procedure and a running runtime at the start', () => {
    const session = createSession(fixtureAircraft);
    expect(session.failures().size).toBe(0);
    expect(session.procedureId()).toBeUndefined();
    expect(session.checklist()).toBeUndefined();
    expect(session.status()).toEqual({ kind: 'running' });
  });
});

describe('pilot input', () => {
  it('moves controls and steps the systems on the change', () => {
    const session = createSession(fixtureAircraft);
    expect(session.set('master', 'on')).toEqual({ applied: true });
    expect(session.state().controls.master).toBe('on');
    expect(fixtureSystems(session).busPowered).toBe(true);
  });

  it('refuses a guarded control until its guard is open', () => {
    const session = createSession(fixtureAircraft);
    expect(session.set('fuelPump', 'on')).toEqual({ applied: false, reason: 'guarded' });
    session.openGuard('fuelPump');
    expect(session.guards().fuelPump).toBe('open');
    expect(session.set('fuelPump', 'on')).toEqual({ applied: true });
  });

  it('advances time through the runtime', () => {
    const session = createSession(fixtureAircraft);
    session.set('master', 'on');
    session.press('ignition', 'start');
    crankUntilRunning(session);
    expect(fixtureSystems(session).engineRunning).toBe(true);
    expect(session.release('ignition')).toEqual({ applied: true });
    expect(session.state().controls.ignition).toBe('both');
  });

  it('rejects a bad step length', () => {
    const session = createSession(fixtureAircraft);
    expect(() => session.advance(-1)).toThrow(RangeError);
    expect(() => session.advance(Number.NaN)).toThrow(RangeError);
  });

  it('reports a failing aircraft step until the next snapshot load', () => {
    const broken = {
      ...fixtureAircraft,
      systems: {
        ...fixtureAircraft.systems,
        step: (state: unknown, input: { controls: { master?: unknown } }) => {
          if (input.controls.master === 'on') throw new Error('step broke');
          return state;
        },
      },
    } as Aircraft;
    const session = createSession(broken);
    session.set('master', 'on');
    expect(session.status()).toMatchObject({ kind: 'failed' });
    session.jumpToPhase('parking');
    expect(session.status()).toEqual({ kind: 'running' });
  });
});

describe('subscribe', () => {
  it('notifies once per change and stops after unsubscribe', () => {
    const session = createSession(fixtureAircraft);
    let calls = 0;
    const off = session.subscribe(() => calls++);
    session.set('master', 'on');
    expect(calls).toBe(1);
    session.advance(STEP_MS);
    expect(calls).toBe(2);
    off();
    session.set('master', 'off');
    expect(calls).toBe(2);
  });

  it('notifies once for a phase jump and once for a procedure start', () => {
    const session = createSession(fixtureAircraft);
    let calls = 0;
    session.subscribe(() => calls++);
    session.jumpToPhase('runup');
    expect(calls).toBe(1);
    session.startProcedure('alternatorFailure');
    expect(calls).toBe(2);
  });

  it('tells every subscriber, then rethrows the first error', () => {
    const session = createSession(fixtureAircraft);
    let reached = false;
    session.subscribe(() => {
      throw new Error('listener broke');
    });
    session.subscribe(() => {
      reached = true;
    });
    expect(() => session.set('master', 'on')).toThrow('listener broke');
    expect(reached).toBe(true);
    expect(session.state().controls.master).toBe('on');
  });
});

describe('jumpToPhase', () => {
  it('loads the entry snapshot: positions, systems state and environment', () => {
    const session = createSession(fixtureAircraft);
    session.jumpToPhase('runup');
    const runup = fixturePhase('runup');
    expect(session.phase()).toBe('runup');
    expect(session.state().controls).toEqual(runup.entry.controls);
    expect(session.state().systems).toBe(runup.entry.state);
    expect(session.environment()).toBe(runup.environment);
  });

  it('passes the phase environment to the next step', () => {
    let seen: unknown;
    const aircraft = {
      ...fixtureAircraft,
      phases: {
        ...fixtureAircraft.phases,
        runup: {
          ...fixturePhase('runup'),
          environment: { airspeedKt: 90, altitudeFt: 2000, onGround: false },
        },
      },
      systems: {
        ...fixtureAircraft.systems,
        step: (state: unknown, input: { environment: unknown }) => {
          seen = input.environment;
          return state;
        },
      },
    } as Aircraft;
    const session = createSession(aircraft);
    session.jumpToPhase('runup');
    session.advance(STEP_MS);
    expect(seen).toEqual({ airspeedKt: 90, altitudeFt: 2000, onGround: false });
  });

  it('resets controls, guards, failures and systems left behind by the pilot', () => {
    const session = createSession(fixtureAircraft);
    disturb(session);
    expect(session.failures().size).toBe(1);
    expect(session.guards().fuelPump).toBe('open');
    session.jumpToPhase('parking');
    const parking = fixturePhase('parking');
    expect(session.state().controls).toEqual(parking.entry.controls);
    expect(session.state().systems).toBe(parking.entry.state);
    expect(session.guards().fuelPump).toBe('closed');
    expect(session.failures().size).toBe(0);
    expect(session.procedureId()).toBeUndefined();
    expect(session.checklist()).toBeUndefined();
  });

  it('enters a phase with the guards its entry declares open', () => {
    const runup = fixturePhase('runup');
    const aircraft = {
      ...fixtureAircraft,
      phases: {
        ...fixtureAircraft.phases,
        runup: { ...runup, entry: { ...runup.entry, guards: { fuelPump: 'open' } } },
      },
    } as Aircraft;
    const session = createSession(aircraft, { phase: 'runup' });
    expect(session.guards().fuelPump).toBe('open');
    session.jumpToPhase('parking');
    expect(session.guards().fuelPump).toBe('closed');
    session.jumpToPhase('runup');
    expect(session.guards().fuelPump).toBe('open');
  });

  it('is reproducible: two runs from the same phase give the same state', () => {
    const first = createSession(fixtureAircraft);
    const second = createSession(fixtureAircraft);
    disturb(first);
    second.jumpToPhase('runup');
    second.advance(STEP_MS * 3);
    first.jumpToPhase('runup');
    second.jumpToPhase('runup');
    expect(fingerprint(first)).toEqual(fingerprint(second));
    expect(fingerprint(first)).toEqual(
      fingerprint(createSession(fixtureAircraft, { phase: 'runup' })),
    );
  });

  it('resets device controls and states too', () => {
    const session = createSession(fixtureDeviceAircraft, { devices: [engineMonitor] });
    session.jumpToPhase('runup');
    session.set('mon.page', 'electrical');
    session.advance(STEP_MS);
    expect(monitorState(session.state())?.page).toBe('electrical');
    const reference = createSession(fixtureDeviceAircraft, {
      devices: [engineMonitor],
      phase: 'runup',
    });
    session.jumpToPhase('runup');
    expect(session.state().controls['mon.page']).toBe('engine');
    expect(session.state().devices).toEqual(reference.state().devices);
    expect(session.state().devices.mon?.on).toBe(true);
  });

  it('throws for an unknown phase and changes nothing', () => {
    const session = createSession(fixtureAircraft);
    session.set('master', 'on');
    const before = fingerprint(session);
    expect(() => session.jumpToPhase('nowhere')).toThrow('nowhere');
    expect(fingerprint(session)).toEqual(before);
  });
});

describe('startProcedure', () => {
  it('throws naming an unknown procedure id and changes nothing', () => {
    const session = createSession(fixtureAircraft);
    session.set('master', 'on');
    const before = fingerprint(session);
    expect(() => session.startProcedure('engineFire')).toThrow('engineFire');
    expect(() => session.startProcedure('toString')).toThrow('toString');
    expect(fingerprint(session)).toEqual(before);
  });

  it('loads the start phase snapshot, so a run begins clean', () => {
    const session = createSession(fixtureAircraft, { phase: 'runup' });
    session.startProcedure('beforeStart');
    expect(session.phase()).toBe('parking');
    expect(session.state().controls).toEqual(fixturePhase('parking').entry.controls);
    expect(session.procedureId()).toBe('beforeStart');
    expect(session.checklist()?.current).toBe(0);
  });

  it('injects the failure of an emergency procedure, tripping its breaker without a deviation', () => {
    const session = createSession(fixtureAircraft);
    session.startProcedure('alternatorFailure');
    expect(session.phase()).toBe('runup');
    expect([...session.failures()]).toEqual(['alternatorFailure']);
    expect(session.state().controls.alternatorBreaker).toBe('pulled');
    expect(fixtureSystems(session).volts).toBe(12);
    expect(session.checklist()?.deviations).toEqual([]);
  });

  it('runs the emergency checklist: the check holds, the confirm finishes it', () => {
    const session = createSession(fixtureAircraft);
    session.startProcedure('alternatorFailure');
    session.checkOff();
    session.checkOff();
    const checklist = session.checklist();
    expect(checklist?.done).toBe(true);
    expect(checklist?.deviations).toEqual([]);
    expect(session.phase()).toBe('runup');
  });

  it('hands the reading of a check-off to the checklist', () => {
    const reading: Aircraft = {
      ...fixtureAircraft,
      procedures: {
        read: {
          title: { de: 'Ablesen', en: 'Read' },
          type: 'normal',
          startPhase: 'parking',
          items: [
            {
              type: 'check',
              target: { indicator: 'busVolts' },
              condition: () => true,
              response: { reading: (state) => (state.systems as FixtureState).volts, tolerance: 0 },
              text: { de: 'Spannung', en: 'Volts' },
            },
          ],
        },
      },
    };
    const session = createSession(reading);
    session.startProcedure('read');
    session.checkOff(5);
    expect(session.checklist()?.deviations).toEqual([
      { kind: 'unmet-check', itemIndex: 0, response: 5 },
    ]);
  });

  it('clears the failure of an earlier emergency when a normal procedure starts', () => {
    const session = createSession(fixtureAircraft);
    session.startProcedure('alternatorFailure');
    session.startProcedure('beforeStart');
    expect(session.failures().size).toBe(0);
    expect(session.state().controls.alternatorBreaker).toBe('in');
  });
});

describe('startSurprise', () => {
  const surprise = { phase: 'runup', failure: 'alternatorFailure', delayMs: 3 * STEP_MS };

  it('loads the phase snapshot with no procedure, no checklist and the failure pending', () => {
    const session = createSession(fixtureAircraft);
    session.startSurprise(surprise);
    expect(session.phase()).toBe('runup');
    expect(session.state().controls).toEqual(fixturePhase('runup').entry.controls);
    expect(session.procedureId()).toBeUndefined();
    expect(session.checklist()).toBeUndefined();
    expect(session.failures().size).toBe(0);
    expect(session.scenario()).toEqual(surprise);
  });

  it('injects the failure once the delay has passed, unannounced', () => {
    const session = createSession(fixtureAircraft);
    session.startSurprise(surprise);
    session.advance(STEP_MS);
    session.advance(STEP_MS);
    expect(session.failures().size).toBe(0);
    expect(session.state().controls.alternatorBreaker).toBe('in');
    session.advance(STEP_MS);
    expect([...session.failures()]).toEqual(['alternatorFailure']);
    expect(session.state().controls.alternatorBreaker).toBe('pulled');
    expect(fixtureSystems(session).volts).toBe(12);
    expect(session.scenario()?.injectedAtMs).toBe(3 * STEP_MS);
    expect(session.procedureId()).toBeUndefined();
  });

  it('notifies once per step, the injecting step included', () => {
    const session = createSession(fixtureAircraft);
    session.startSurprise({ ...surprise, delayMs: STEP_MS });
    let calls = 0;
    session.subscribe(() => calls++);
    session.advance(STEP_MS);
    expect(calls).toBe(1);
  });

  it('throws for an unknown failure or phase or a bad delay and changes nothing', () => {
    const session = createSession(fixtureAircraft);
    session.set('master', 'on');
    const before = fingerprint(session);
    expect(() => session.startSurprise({ ...surprise, failure: 'engineFire' })).toThrow(
      'engineFire',
    );
    expect(() => session.startSurprise({ ...surprise, failure: 'toString' })).toThrow('toString');
    expect(() => session.startSurprise({ ...surprise, phase: 'nowhere' })).toThrow('nowhere');
    expect(() => session.startSurprise({ ...surprise, delayMs: -1 })).toThrow(RangeError);
    expect(fingerprint(session)).toEqual(before);
    expect(session.scenario()).toBeUndefined();
  });

  it('is cancelled by a phase jump or a procedure start', () => {
    const session = createSession(fixtureAircraft);
    session.startSurprise(surprise);
    session.jumpToPhase('runup');
    expect(session.scenario()).toBeUndefined();
    session.startSurprise(surprise);
    session.startProcedure('beforeStart');
    expect(session.scenario()).toBeUndefined();
    for (let step = 0; step < 4; step++) session.advance(STEP_MS);
    expect(session.failures().size).toBe(0);
  });
});

describe('takeChecklist', () => {
  const surprise = { phase: 'runup', failure: 'alternatorFailure', delayMs: STEP_MS };

  it('runs the chosen checklist from the cockpit as it stands and times the recognition', () => {
    const session = createSession(fixtureAircraft);
    session.startSurprise(surprise);
    session.set('throttle', 0.5);
    session.advance(STEP_MS);
    session.advance(STEP_MS);
    session.advance(STEP_MS);
    session.takeChecklist('alternatorFailure');
    expect(session.procedureId()).toBe('alternatorFailure');
    expect(session.state().controls.throttle).toBe(0.5);
    expect(session.state().controls.alternatorBreaker).toBe('pulled');
    expect(session.checklist()?.current).toBe(0);
    expect(session.scenario()).toMatchObject({
      chosen: 'alternatorFailure',
      recognitionMs: 2 * STEP_MS,
      matched: true,
    });
  });

  it('records a checklist that does not match the failure, injecting nothing of its own', () => {
    const session = createSession(fixtureAircraft);
    session.startSurprise(surprise);
    session.advance(STEP_MS);
    session.takeChecklist('beforeStart');
    expect(session.procedureId()).toBe('beforeStart');
    expect(session.phase()).toBe('runup');
    expect(session.state().controls.master).toBe('on');
    expect(session.scenario()).toMatchObject({ chosen: 'beforeStart', matched: false });
  });

  it('injects a pending failure when the pilot chooses before it appeared', () => {
    const session = createSession(fixtureAircraft);
    session.startSurprise({ ...surprise, delayMs: 10 * STEP_MS });
    session.takeChecklist('alternatorFailure');
    expect([...session.failures()]).toEqual(['alternatorFailure']);
    const scenario = session.scenario();
    expect(scenario).toMatchObject({ chosen: 'alternatorFailure', matched: true });
    expect(scenario?.injectedAtMs).toBe(0);
    expect(scenario).not.toHaveProperty('recognitionMs');
  });

  it('times the chosen checklist from the choice', () => {
    const session = createSession(fixtureAircraft);
    session.startSurprise(surprise);
    session.advance(STEP_MS);
    session.advance(STEP_MS);
    session.takeChecklist('alternatorFailure');
    session.advance(STEP_MS);
    session.checkOff();
    session.checkOff();
    expect(session.checklist()?.elapsedMs).toBe(STEP_MS);
    expect(session.scenario()?.chosen).toBe('alternatorFailure');
  });

  it('keeps the first choice when another checklist is taken later', () => {
    const session = createSession(fixtureAircraft);
    session.startSurprise(surprise);
    session.advance(STEP_MS);
    session.takeChecklist('beforeStart');
    session.takeChecklist('alternatorFailure');
    expect(session.procedureId()).toBe('alternatorFailure');
    expect(session.scenario()).toMatchObject({ chosen: 'beforeStart', matched: false });
  });

  it('starts a checklist from the cockpit as it stands outside a surprise too', () => {
    const session = createSession(fixtureAircraft, { phase: 'runup' });
    session.set('throttle', 0.5);
    session.takeChecklist('beforeStart');
    expect(session.state().controls.throttle).toBe(0.5);
    expect(session.scenario()).toBeUndefined();
    expect(session.failures().size).toBe(0);
  });

  it('throws naming an unknown procedure and changes nothing', () => {
    const session = createSession(fixtureAircraft);
    session.startSurprise(surprise);
    const before = fingerprint(session);
    expect(() => session.takeChecklist('engineFire')).toThrow('engineFire');
    expect(fingerprint(session)).toEqual(before);
    expect(session.scenario()?.chosen).toBeUndefined();
  });
});

describe('retryItem', () => {
  it('restores the cockpit to the start of the current item and keeps the record', () => {
    const session = createSession(fixtureAircraft);
    session.startProcedure('beforeStart');
    session.set('master', 'on');
    expect(session.checklist()?.current).toBe(1);
    const atItem = session.state();
    session.set('master', 'off');
    session.set('throttle', 0.6);
    expect(fixtureSystems(session).busPowered).toBe(false);
    session.retryItem();
    expect(session.state().controls).toEqual(atItem.controls);
    expect(session.state().systems).toEqual(atItem.systems);
    const checklist = session.checklist();
    expect(checklist?.current).toBe(1);
    expect(checklist?.completed).toEqual([0]);
    expect(checklist?.deviations).toHaveLength(2);
    expect(checklist?.assists).toBe(1);
  });

  it('restores open guards and leaves injected failures alone', () => {
    const session = createSession(fixtureAircraft);
    session.startProcedure('alternatorFailure');
    session.openGuard('fuelPump');
    session.retryItem();
    expect(session.guards().fuelPump).toBe('closed');
    expect([...session.failures()]).toEqual(['alternatorFailure']);
  });

  it('lets the item be done again after the restore', () => {
    const session = createSession(fixtureAircraft);
    session.startProcedure('beforeStart');
    session.set('master', 'on');
    session.set('master', 'off');
    session.retryItem();
    expect(session.state().controls.master).toBe('on');
    session.openGuard('fuelPump');
    session.set('fuelPump', 'on');
    expect(session.checklist()?.current).toBe(2);
  });

  it('does nothing without a running checklist', () => {
    const session = createSession(fixtureAircraft);
    session.set('throttle', 0.3);
    session.retryItem();
    expect(session.state().controls.throttle).toBe(0.3);
  });

  it('does nothing once the procedure is done', () => {
    const session = createSession(fixtureAircraft);
    session.startProcedure('alternatorFailure');
    session.checkOff();
    session.checkOff();
    session.set('throttle', 0.3);
    session.retryItem();
    expect(session.state().controls.throttle).toBe(0.3);
    expect(session.checklist()?.assists).toBe(0);
  });

  it('notifies once', () => {
    const session = createSession(fixtureAircraft);
    session.startProcedure('beforeStart');
    let calls = 0;
    session.subscribe(() => (calls += 1));
    session.retryItem();
    expect(calls).toBe(1);
  });
});

describe('retryItem in a flow', () => {
  const flowAircraft: Aircraft = {
    ...fixtureAircraft,
    procedures: {
      scan: {
        title: { de: 'Scan', en: 'Scan' },
        type: 'normal',
        startPhase: 'parking',
        items: [
          {
            type: 'action',
            flow: true,
            control: 'master',
            position: 'on',
            text: { de: 'M', en: 'M' },
          },
          {
            type: 'action',
            flow: true,
            control: 'flaps',
            position: 'takeoff',
            text: { de: 'P', en: 'P' },
          },
          { type: 'action', control: 'master', position: 'on', text: { de: 'M', en: 'M' } },
        ],
      },
    },
  };

  it('keeps a flow item done out of order when the open one is retried', () => {
    const session = createSession(flowAircraft);
    session.startProcedure('scan');
    session.set('flaps', 'takeoff');
    expect(session.checklist()?.current).toBe(0);
    session.set('throttle', 0.6);
    session.retryItem();
    expect(session.state().controls.flaps).toBe('takeoff');
    expect(session.state().controls.throttle).toBe(0);
    expect(session.checklist()?.completed).toEqual([1]);
  });
});

describe('elapsed time of a procedure', () => {
  const finish = (session: Session) => {
    session.checkOff();
    session.checkOff();
  };

  it('is the time advanced from the start to the last item, set when it is done', () => {
    const session = createSession(fixtureAircraft);
    session.startProcedure('alternatorFailure');
    session.advance(STEP_MS);
    session.advance(STEP_MS);
    expect(session.checklist()?.elapsedMs).toBe(0);
    finish(session);
    session.advance(STEP_MS);
    expect(session.checklist()?.elapsedMs).toBe(2 * STEP_MS);
  });

  it('starts over with the next run', () => {
    const session = createSession(fixtureAircraft);
    session.startProcedure('alternatorFailure');
    session.advance(STEP_MS);
    session.startProcedure('alternatorFailure');
    finish(session);
    expect(session.checklist()?.elapsedMs).toBe(0);
  });

  it('keeps the checklist the same object while time passes', () => {
    const session = createSession(fixtureAircraft);
    session.startProcedure('beforeStart');
    const before = session.checklist();
    session.advance(STEP_MS);
    expect(session.checklist()).toBe(before);
  });
});

describe('the before-start walk-through', () => {
  it('completes from parking with no deviations and ends in run-up, keeping the state', () => {
    const session = createSession(fixtureAircraft);
    session.startProcedure('beforeStart');
    expect(session.phase()).toBe('parking');

    session.set('master', 'on');
    expect(session.checklist()?.current).toBe(1);

    session.openGuard('fuelPump');
    session.set('fuelPump', 'on');
    session.closeGuard('fuelPump');
    expect(session.checklist()?.current).toBe(2);

    session.checkOff();
    session.checkOff();
    expect(session.checklist()?.current).toBe(4);

    session.set('ignition', 'both');
    expect(session.checklist()?.current).toBe(5);

    session.press('ignition', 'start');
    session.advance(STEP_MS);
    expect(session.checklist()?.current).toBe(5);
    crankUntilRunning(session);
    expect(session.checklist()?.current).toBe(6);

    session.release('ignition');
    expect(session.state().controls.ignition).toBe('both');
    expect(session.checklist()?.deviations).toEqual([]);
    expect(session.phase()).toBe('parking');

    const before = session.state();
    session.checkOff();
    const checklist = session.checklist();
    expect(checklist?.done).toBe(true);
    expect(checklist?.completed).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(checklist?.deviations).toEqual([]);

    expect(session.phase()).toBe('runup');
    expect(session.environment()).toBe(fixturePhase('runup').environment);
    expect(session.state()).toEqual(before);
    expect(session.state().controls.fuelPump).toBe('on');
    expect(session.state().controls.master).toBe('on');
    expect(session.guards().fuelPump).toBe('closed');
  });

  it('records a pilot move of another control as a deviation', () => {
    const session = createSession(fixtureAircraft);
    session.startProcedure('beforeStart');
    session.set('flaps', 'landing');
    expect(session.checklist()?.deviations).toEqual([
      {
        kind: 'unexpected-control',
        itemIndex: 0,
        controlId: 'flaps',
        position: 'landing',
        from: 'up',
      },
    ]);
  });
});

describe('consecutive presses of a spring-back control', () => {
  it('need a fresh press for each item', () => {
    const procedure = fixtureAircraft.procedures.beforeStart;
    if (!procedure) throw new Error('fixture has no beforeStart');
    const press = {
      type: 'action',
      control: 'lampTest',
      position: 'pressed',
      text: { de: 'Drücken', en: 'Press' },
    } as const;
    const twice = {
      ...fixtureAircraft,
      procedures: { twice: { ...procedure, items: [press, press] } },
    };
    const session = createSession(twice as unknown as Aircraft);
    session.startProcedure('twice');

    session.press('lampTest');
    expect(session.checklist()?.current).toBe(1);
    session.advance(STEP_MS);
    expect(session.checklist()?.current).toBe(1);

    session.release('lampTest');
    session.press('lampTest');
    expect(session.checklist()?.done).toBe(true);
  });
});

describe('procedure end phase', () => {
  const emergencyWithEnd = {
    ...fixtureAircraft,
    procedures: {
      ...fixtureAircraft.procedures,
      shutDown: {
        title: { de: 'Abstellen', en: 'Shut down' },
        type: 'emergency',
        startPhase: 'runup',
        endPhase: 'parking',
        failure: 'alternatorFailure',
        items: [{ type: 'confirm', text: { de: 'Bereit', en: 'Ready' } }],
      },
    },
  } as Aircraft;

  it('keeps positions, systems state and failures when it moves to the end phase', () => {
    const session = createSession(emergencyWithEnd);
    session.startProcedure('shutDown');
    const before = session.state();
    session.checkOff();
    expect(session.phase()).toBe('parking');
    expect(session.environment()).toBe(emergencyWithEnd.phases.parking?.environment);
    expect(session.state()).toEqual(before);
    expect(session.state().controls.master).toBe('on');
    expect(session.state().controls.alternatorBreaker).toBe('pulled');
    expect([...session.failures()]).toEqual(['alternatorFailure']);
  });

  it('moves to the end phase once, not again on later input', () => {
    const session = createSession(emergencyWithEnd);
    session.startProcedure('shutDown');
    session.checkOff();
    session.jumpToPhase('runup');
    session.set('flaps', 'takeoff');
    session.advance(STEP_MS);
    session.checkOff();
    expect(session.phase()).toBe('runup');
  });

  it('stays in the phase when the procedure has no end phase', () => {
    const session = createSession(fixtureAircraft);
    session.startProcedure('alternatorFailure');
    session.checkOff();
    session.checkOff();
    expect(session.checklist()?.done).toBe(true);
    expect(session.phase()).toBe('runup');
  });
});

describe('devices in the session', () => {
  it('steps devices after the aircraft step and lets a procedure target a device control', () => {
    const session = createSession(fixtureDeviceAircraft, { devices: [engineMonitor] });
    session.startProcedure('monitorElectrical');
    expect(monitorState(session.state())?.reading).toBe(700);
    expect(session.state().devices.mon?.on).toBe(true);
    session.set('mon.page', 'electrical');
    expect(session.checklist()?.completed).toEqual([0]);
    expect(monitorState(session.state())?.reading).toBe(14);
    session.checkOff();
    expect(session.checklist()?.done).toBe(true);
    expect(session.checklist()?.deviations).toEqual([]);
  });

  it('throws when an install names a device that is not registered', () => {
    expect(() => createSession(fixtureDeviceAircraft)).toThrow(/engineMonitor/);
  });
});

describe('a failing device step', () => {
  const throwing = defineDevice({
    id: 'engineMonitor',
    manual: engineMonitor.manual,
    notModelled: engineMonitor.notModelled,
    controls: engineMonitor.controls,
    initial: engineMonitor.initial,
    step: (state, input) => {
      if (input.controls.page === 'electrical') throw new Error('device broke');
      return engineMonitor.step(state, input);
    },
  });
  const start = () => {
    const session = createSession(fixtureDeviceAircraft, { devices: [throwing] });
    session.startProcedure('beforeStart');
    return session;
  };

  it('applies the whole change, reports failed and notifies once', () => {
    const session = start();
    let calls = 0;
    session.subscribe(() => calls++);
    expect(session.set('mon.page', 'electrical')).toEqual({ applied: true });
    expect(session.state().controls['mon.page']).toBe('electrical');
    expect(session.status()).toMatchObject({ kind: 'failed' });
    expect(session.checklist()?.deviations).toEqual([
      {
        kind: 'unexpected-control',
        itemIndex: 0,
        controlId: 'mon.page',
        position: 'electrical',
        from: 'engine',
      },
    ]);
    expect(calls).toBe(1);
  });

  it('ignores input, time and check-off while failed', () => {
    const session = start();
    session.set('mon.page', 'electrical');
    let calls = 0;
    session.subscribe(() => calls++);
    const before = session.state();
    expect(session.set('master', 'on')).toEqual({ applied: false, reason: 'failed' });
    expect(session.openGuard('fuelPump')).toEqual({ applied: false, reason: 'failed' });
    session.advance(STEP_MS);
    session.checkOff();
    expect(session.state()).toBe(before);
    expect(calls).toBe(0);
    expect(() => session.advance(-1)).toThrow(RangeError);
  });

  describe('with the systems mid-start', () => {
    const failWhileCranking = () => {
      const session = start();
      session.set('master', 'on');
      session.set('ignition', 'start');
      session.set('mon.page', 'electrical');
      return session;
    };

    it('does not step the systems while failed', () => {
      const session = failWhileCranking();
      for (let elapsed = 0; elapsed < STARTER_MS_TO_START * 2; elapsed += STEP_MS) {
        session.advance(STEP_MS);
      }
      expect(session.status()).toMatchObject({ kind: 'failed' });
      expect(fixtureSystems(session).starterMs).toBe(0);
      expect(fixtureSystems(session).engineRunning).toBe(false);
    });

    it('resumes stepping after a snapshot load', () => {
      const session = failWhileCranking();
      session.advance(STEP_MS);
      session.jumpToPhase('parking');
      session.set('master', 'on');
      session.set('ignition', 'start');
      session.advance(STEP_MS);
      expect(session.status()).toEqual({ kind: 'running' });
      expect(fixtureSystems(session).starterMs).toBe(STEP_MS);
    });
  });

  it('recovers on a phase jump or a procedure start', () => {
    const session = start();
    session.set('mon.page', 'electrical');
    session.jumpToPhase('parking');
    expect(session.status()).toEqual({ kind: 'running' });
    expect(session.set('master', 'on')).toEqual({ applied: true });
    session.set('mon.page', 'electrical');
    expect(session.status()).toMatchObject({ kind: 'failed' });
    session.startProcedure('beforeStart');
    expect(session.status()).toEqual({ kind: 'running' });
  });

  it('still completes a snapshot load whose device step throws', () => {
    const aircraft = {
      ...fixtureDeviceAircraft,
      phases: {
        ...fixtureDeviceAircraft.phases,
        runup: {
          ...fixtureDeviceAircraft.phases.runup,
          entry: {
            ...fixtureDeviceAircraft.phases.runup?.entry,
            devices: { mon: { page: 'electrical' } },
          },
        },
      },
    } as Aircraft;
    const session = createSession(aircraft, { devices: [throwing] });
    let calls = 0;
    session.subscribe(() => calls++);
    session.jumpToPhase('runup');
    expect(session.phase()).toBe('runup');
    expect(session.state().controls['mon.page']).toBe('electrical');
    expect(session.status()).toMatchObject({ kind: 'failed' });
    expect(calls).toBe(1);
  });

  it('reports the aircraft step failure the same way', () => {
    const broken = {
      ...fixtureAircraft,
      systems: {
        ...fixtureAircraft.systems,
        step: (state: unknown, input: { controls: { master?: unknown } }) => {
          if (input.controls.master === 'on') throw new Error('step broke');
          return state;
        },
      },
    } as Aircraft;
    const session = createSession(broken);
    session.set('master', 'on');
    expect(session.set('flaps', 'landing')).toEqual({ applied: false, reason: 'failed' });
    expect(session.state().controls.flaps).toBe('up');
  });
});

describe('an injected failure that trips no breaker', () => {
  const quiet = {
    ...fixtureAircraft,
    failures: { alternatorFailure: { name: { de: 'Ausfall', en: 'Failure' } } },
  } as Aircraft;

  it('reaches the systems state before the checklist starts', () => {
    const session = createSession(quiet);
    session.startProcedure('alternatorFailure');
    expect(session.state().controls.alternatorBreaker).toBe('in');
    expect((session.state().systems as FixtureState).volts).toBe(12);
  });
});

describe('notifications and errors', () => {
  const noisy = (session: Session) => {
    let calls = 0;
    session.subscribe(() => {
      calls++;
      throw new Error('listener broke');
    });
    return () => calls;
  };

  it('does not notify, and throws the original error, for an unknown phase or procedure', () => {
    const session = createSession(fixtureAircraft);
    const calls = noisy(session);
    expect(() => session.jumpToPhase('nowhere')).toThrow('nowhere');
    expect(() => session.startProcedure('engineFire')).toThrow('engineFire');
    expect(calls()).toBe(0);
  });

  it('rejects a procedure naming an undeclared failure before changing anything', () => {
    const aircraft = {
      ...fixtureAircraft,
      procedures: {
        ...fixtureAircraft.procedures,
        broken: { ...fixtureAircraft.procedures.alternatorFailure, failure: 'engineFire' },
      },
    } as Aircraft;
    const session = createSession(aircraft);
    session.set('master', 'on');
    const before = fingerprint(session);
    const calls = noisy(session);
    expect(() => session.startProcedure('broken')).toThrow('engineFire');
    expect(fingerprint(session)).toEqual(before);
    expect(calls()).toBe(0);
  });

  it('still throws a listener error after a successful jump', () => {
    const session = createSession(fixtureAircraft);
    const calls = noisy(session);
    expect(() => session.jumpToPhase('runup')).toThrow('listener broke');
    expect(calls()).toBe(1);
    expect(session.phase()).toBe('runup');
  });
});

describe('device state reset', () => {
  const counter = defineDevice({
    id: 'engineMonitor',
    manual: engineMonitor.manual,
    notModelled: engineMonitor.notModelled,
    controls: engineMonitor.controls,
    initial: { steps: 0 },
    step: (state) => ({ steps: (state as { steps: number }).steps + 1 }),
  });
  const create = (phase: string) =>
    createSession(fixtureDeviceAircraft, { devices: [counter], phase });

  it('restarts devices from their initial state on a jump', () => {
    const session = create('parking');
    for (let tick = 0; tick < 5; tick++) session.advance(STEP_MS);
    session.set('master', 'on');
    session.jumpToPhase('runup');
    expect(session.state().devices).toEqual(create('runup').state().devices);
  });
});

describe('stable snapshots', () => {
  it('returns the same references until something changes', () => {
    const session = createSession(fixtureAircraft);
    expect(session.state()).toBe(session.state());
    expect(session.guards()).toBe(session.guards());
    expect(session.failures()).toBe(session.failures());
    expect(session.status()).toBe(session.status());
    session.startProcedure('beforeStart');
    expect(session.checklist()).toBe(session.checklist());
  });

  it('returns new references after each kind of change', () => {
    const session = createSession(fixtureAircraft);
    const first = session.state();
    session.set('master', 'on');
    const second = session.state();
    expect(second).not.toBe(first);
    session.advance(STEP_MS);
    expect(session.state()).not.toBe(second);
    const guards = session.guards();
    session.openGuard('fuelPump');
    expect(session.guards()).not.toBe(guards);
    const failures = session.failures();
    session.startProcedure('alternatorFailure');
    expect(session.failures()).not.toBe(failures);
    const afterStart = session.state();
    session.jumpToPhase('parking');
    expect(session.state()).not.toBe(afterStart);
  });

  it('is current inside a subscriber', () => {
    const session = createSession(fixtureAircraft);
    let seen: unknown;
    session.subscribe(() => {
      seen = session.state().controls.master;
    });
    session.set('master', 'on');
    expect(seen).toBe('on');
  });
});

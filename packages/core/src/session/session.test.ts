import { describe, expect, it } from 'vitest';
import type { Aircraft } from '../contract';
import { fixtureAircraft, STARTER_MS_TO_START } from '../contract/fixtures';
import type { FixtureState } from '../contract/fixtures';
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

  it('clears the failure of an earlier emergency when a normal procedure starts', () => {
    const session = createSession(fixtureAircraft);
    session.startProcedure('alternatorFailure');
    session.startProcedure('beforeStart');
    expect(session.failures().size).toBe(0);
    expect(session.state().controls.alternatorBreaker).toBe('in');
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

    session.press('ignition', 'start');
    session.advance(STEP_MS);
    expect(session.checklist()?.current).toBe(4);
    crankUntilRunning(session);
    expect(session.checklist()?.current).toBe(5);

    session.release('ignition');
    expect(session.state().controls.ignition).toBe('both');
    expect(session.checklist()?.deviations).toEqual([]);
    expect(session.phase()).toBe('parking');

    const before = session.state();
    session.checkOff();
    const checklist = session.checklist();
    expect(checklist?.done).toBe(true);
    expect(checklist?.completed).toEqual([0, 1, 2, 3, 4, 5]);
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
      { kind: 'unexpected-control', itemIndex: 0, controlId: 'flaps' },
    ]);
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

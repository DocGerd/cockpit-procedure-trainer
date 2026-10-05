import {
  CONTRACT_VERSION,
  STEP_MS,
  createSession,
  validateAircraft,
  walkProcedure,
} from '@cpt/core';
import type { ControlKind, Session } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { demoAircraft } from './index';
import type { DemoState } from './systems';

const CONTROL_KINDS: readonly ControlKind[] = [
  'toggle',
  'rotary',
  'lever',
  'momentary',
  'guarded',
  'breaker',
];

const systems = (session: Session) => session.state().systems as DemoState;
const reading = (session: Session, indicator: string) =>
  demoAircraft.indicators[indicator]?.select(session.state());
const run = (session: Session, ms: number) => {
  for (let elapsed = 0; elapsed < ms; elapsed += STEP_MS) session.advance(STEP_MS);
};

function readyToStart(overrides: Record<string, string | number> = {}): Session {
  const session = createSession(demoAircraft, { phase: 'parking' });
  const settings = {
    fuelSelector: 'both',
    mixture: 1,
    battery: 'on',
    magnetos: 'both',
    ...overrides,
  };
  for (const [control, position] of Object.entries(settings)) session.set(control, position);
  return session;
}

describe('demo aircraft', () => {
  it('targets the current contract', () => {
    expect(demoAircraft.contractVersion).toBe(CONTRACT_VERSION);
  });

  it('passes the validator', () => {
    expect(validateAircraft(demoAircraft)).toEqual([]);
  });

  it('uses every control kind and springs one rotary detent back', () => {
    const controls = Object.values(demoAircraft.controls);
    expect(new Set(controls.map((control) => control.kind))).toEqual(new Set(CONTROL_KINDS));
    expect(controls.some((control) => control.kind === 'rotary' && control.springBack)).toBe(true);
  });

  it('declares only generic widgets', () => {
    const appearances = [
      ...Object.values(demoAircraft.controls),
      ...Object.values(demoAircraft.indicators),
    ].map((definition) => definition.appearance);
    for (const appearance of appearances) {
      expect(appearance).toBeDefined();
      expect(appearance).not.toHaveProperty('artwork');
    }
  });

  it('has two views and phases for the parked, taxiing and flying situations', () => {
    expect(Object.keys(demoAircraft.views)).toHaveLength(2);
    expect(Object.keys(demoAircraft.phases).length).toBeGreaterThanOrEqual(3);
    for (const phase of Object.values(demoAircraft.phases)) expect(phase.image).not.toBe('');
  });

  it('keeps the magneto key and the starter on separate controls', () => {
    expect(demoAircraft.controls.magnetos?.kind).toBe('rotary');
    expect(demoAircraft.controls.starter?.kind).toBe('momentary');
  });

  it('runs the engine after a correct start', () => {
    const session = readyToStart({ alternator: 'on' });
    session.press('starter');
    run(session, 3000);
    expect(systems(session).engine.running).toBe(true);
    session.release('starter');
    run(session, 500);
    expect(systems(session).engine.running).toBe(true);
    expect(systems(session).amps).toBeGreaterThan(0);
  });

  it('turns the engine but does not start it with the magnetos off', () => {
    const session = readyToStart({ magnetos: 'off' });
    session.press('starter');
    run(session, 5000);
    expect(systems(session).engine.running).toBe(false);
    expect(systems(session).rpm).toBeGreaterThan(0);
  });

  it('leaves the starter unpowered and the engine stopped without the battery', () => {
    const session = readyToStart({ battery: 'off' });
    session.press('starter');
    run(session, 5000);
    expect(systems(session).engine.running).toBe(false);
    expect(systems(session).rpm).toBe(0);
  });

  it('does not start with the mixture at idle cut-off', () => {
    const session = readyToStart({ mixture: 0 });
    session.press('starter');
    run(session, 5000);
    expect(systems(session).engine.running).toBe(false);
  });

  it('stops a running engine when the mixture is pulled to idle cut-off', () => {
    const session = createSession(demoAircraft, { phase: 'holding' });
    run(session, STEP_MS);
    expect(systems(session).engine.running).toBe(true);
    session.set('mixture', 0);
    expect(systems(session).engine.running).toBe(false);
  });

  it('lights the lamps while the annunciator switch is held at test', () => {
    const session = readyToStart({ battery: 'on' });
    session.press('annunciator', 'test');
    expect(reading(session, 'lowVoltageLamp')).toBe(true);
    expect(reading(session, 'oilPressureLamp')).toBe(true);
  });

  describe('alternator failure', () => {
    it('trips its breaker and lights the low-voltage lamp', () => {
      const session = createSession(demoAircraft, { phase: 'cruise' });
      expect(reading(session, 'lowVoltageLamp')).toBe(false);
      expect(session.state().controls.alternatorBreaker).toBe('in');

      session.startProcedure('alternatorFailure');
      run(session, STEP_MS);
      expect(session.state().controls.alternatorBreaker).toBe('pulled');
      expect(reading(session, 'lowVoltageLamp')).toBe(true);
      expect(systems(session).amps).toBeLessThan(0);
    });

    it('stays failed after the breaker is reset', () => {
      const session = createSession(demoAircraft, { phase: 'cruise' });
      session.startProcedure('alternatorFailure');
      session.set('alternatorBreaker', 'in');
      run(session, STEP_MS);
      expect(reading(session, 'lowVoltageLamp')).toBe(true);
    });
  });

  it.each(Object.keys(demoAircraft.procedures))('walks %s with no deviations', (id) => {
    expect(walkProcedure(demoAircraft, id)).toEqual({ ok: true });
  });

  it('has two normal procedures and an emergency naming its failure', () => {
    const procedures = Object.values(demoAircraft.procedures);
    expect(procedures.filter((procedure) => procedure.type === 'normal')).toHaveLength(2);
    const emergencies = procedures.filter((procedure) => procedure.type === 'emergency');
    expect(emergencies).toHaveLength(1);
    expect(emergencies[0]?.failure).toBe('alternatorFailure');
  });
});

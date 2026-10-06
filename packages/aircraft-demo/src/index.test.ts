import {
  CONTRACT_VERSION,
  STEP_MS,
  createSession,
  validateAircraft,
  walkProcedure,
} from '@cpt/core';
import type { ControlKind, Session } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import viewConsole from './assets/view-console.svg?raw';
import viewPanel from './assets/view-panel.svg?raw';
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

  describe('with the engine running', () => {
    const running = (): Session => createSession(demoAircraft, { phase: 'holding' });

    it('lights the lamps only while the annunciator switch is held at test', () => {
      const session = running();
      expect(reading(session, 'lowVoltageLamp')).toBe(false);
      expect(reading(session, 'oilPressureLamp')).toBe(false);
      session.press('annunciator', 'test');
      expect(reading(session, 'lowVoltageLamp')).toBe(true);
      expect(reading(session, 'oilPressureLamp')).toBe(true);
      session.release('annunciator');
      expect(reading(session, 'lowVoltageLamp')).toBe(false);
      expect(reading(session, 'oilPressureLamp')).toBe(false);
    });

    it('stops when the fuel shut-off is closed', () => {
      const session = running();
      session.openGuard('fuelShutoff');
      session.set('fuelShutoff', 'shut');
      expect(systems(session).engine.running).toBe(false);
    });

    it('stops when the fuel selector is turned off', () => {
      const session = running();
      session.set('fuelSelector', 'off');
      expect(systems(session).engine.running).toBe(false);
    });

    it('does not charge with the alternator breaker pulled', () => {
      const session = running();
      session.advance(STEP_MS);
      expect(systems(session).bus.charging).toBe(true);
      session.set('alternatorBreaker', 'pulled');
      expect(systems(session).bus.charging).toBe(false);
      expect(reading(session, 'lowVoltageLamp')).toBe(true);
    });

    it('unpowers the avionics with the avionics breaker pulled', () => {
      const session = running();
      expect(systems(session).avionicsPowered).toBe(true);
      session.set('avionicsBreaker', 'pulled');
      expect(systems(session).avionicsPowered).toBe(false);
    });

    it('loses rpm on a single magneto and recovers on both', () => {
      const session = running();
      session.set('throttle', 1);
      const both = systems(session).rpm;
      session.set('magnetos', 'right');
      const right = systems(session).rpm;
      expect(right).toBeLessThan(both);
      expect(both - right).toBeLessThanOrEqual(150);
      session.set('magnetos', 'left');
      expect(systems(session).rpm).toBe(right);
      session.set('magnetos', 'both');
      expect(systems(session).rpm).toBe(both);
    });
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

describe('declared view sizes', () => {
  const sources: Record<string, string> = { panel: viewPanel, console: viewConsole };

  it.each(Object.keys(sources))('view %s matches the viewBox of its image', (id) => {
    const match = /viewBox="([^"]+)"/.exec(sources[id] ?? '');
    const [x, y, width, height] = (match?.[1] ?? '').split(/[\s,]+/).map(Number);
    expect([x, y]).toEqual([0, 0]);
    expect(demoAircraft.views[id]?.size).toEqual({ width, height });
  });
});

import { STEP_MS, createSession, walkProcedure } from '@cpt/core';
import type { Aircraft, Session } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { ctslAircraft } from '../index';
import type { CtslState } from '../systems';
import { testDevices as devices } from '../test-devices';
import { emergencyProcedures } from './emergency';

type Procedure = (typeof ctslAircraft.procedures)[string];

const expected = [
  ['engineFailureLow', 'departure', 'engineStoppage'],
  ['engineFailureRestart', 'cruise', 'engineStoppage'],
  ['rescueDeployment', 'cruise', 'engineStoppage'],
  ['engineFire', 'cruise', 'engineFire'],
  ['coolantLoss', 'cruise', 'coolantLoss'],
  ['oilLoss', 'cruise', 'oilLoss'],
  ['flapControlFailure', 'cruise', 'flapControlFailure'],
  ['generatorFailure', 'cruise', 'generatorFailure'],
] as const;

const ids = Object.keys(emergencyProcedures);
const procedure = (id: string) => ctslAircraft.procedures[id] as Procedure;

const withProcedure = (id: string, change: (procedure: Procedure) => unknown): Aircraft =>
  ({
    ...ctslAircraft,
    procedures: { ...ctslAircraft.procedures, [id]: change(procedure(id)) },
  }) as Aircraft;

const withoutFailure = (id: string) =>
  withProcedure(id, (original) => ({ ...original, type: 'normal', failure: undefined }));

const withoutItem = (id: string, index: number) =>
  withProcedure(id, (original) => ({
    ...original,
    items: original.items.filter((_, at) => at !== index),
  }));

const itemIndex = (id: string, matches: (item: Procedure['items'][number]) => boolean) => {
  const index = procedure(id).items.findIndex(matches);
  if (index < 0) throw new Error(`no matching item in ${id}`);
  return index;
};

const actionOn = (id: string, control: string, position: string) =>
  itemIndex(
    id,
    (item) => item.type === 'action' && item.control === control && item.position === position,
  );

const firstCheck = (id: string) => itemIndex(id, (item) => item.type === 'check');

const systems = (session: Session) => session.state().systems as CtslState;
const run = (session: Session, ms: number) => {
  for (let elapsed = 0; elapsed < ms; elapsed += STEP_MS) session.advance(STEP_MS);
};

describe('CTSL emergency procedures', () => {
  it('are the eight of the plan, each injecting its failure from its phase', () => {
    expect(ids).toEqual(expected.map(([id]) => id));
    for (const [id, startPhase, failure] of expected) {
      expect(procedure(id)).toMatchObject({ type: 'emergency', startPhase, failure });
    }
  });

  it.each(ids)('walks %s with no deviations', (id) => {
    expect(walkProcedure(ctslAircraft, id, { devices })).toEqual({ ok: true });
  });

  it.each(ids)('%s stops at its first check without the failure', (id) => {
    expect(walkProcedure(withoutFailure(id), id, { devices })).toMatchObject({
      ok: false,
      itemIndex: firstCheck(id),
      reason: 'condition not met',
    });
  });

  // The memory items are assumed (unverified), docs/aircraft/ctsl-intake.md §9 question 23.
  it.each([
    ['engineFailureLow', 2],
    ['engineFailureRestart', 5],
    ['rescueDeployment', 5],
    ['engineFire', 4],
    ['oilLoss', 4],
    ['coolantLoss', 0],
    ['flapControlFailure', 0],
    ['generatorFailure', 0],
  ] as const)('%s opens with %i memory items', (id, count) => {
    const flags = procedure(id).items.map((item) => item.memory === true);
    expect(flags).toEqual(flags.map((_, index) => index < count));
  });

  it('marks the generator failure procedure as club-authored', () => {
    expect(procedure('generatorFailure').title.en).toMatch(/club-authored/);
    expect(procedure('generatorFailure').title.de).toMatch(/Verein/);
  });

  it('never deploys the rescue system in the engine fire procedure', () => {
    const touched = procedure('engineFire').items.filter(
      (item) => item.type === 'action' && item.control === 'rescueHandle',
    );
    expect(touched).toEqual([]);
  });

  it('deploys the rescue system only after the ignition is off', () => {
    expect(actionOn('rescueDeployment', 'ignition', 'off')).toBeLessThan(
      actionOn('rescueDeployment', 'rescueHandle', 'pulled'),
    );
  });

  it('finds the safety pin already out when the rescue deployment starts', () => {
    const session = createSession(ctslAircraft, { devices });
    session.startProcedure('rescueDeployment');
    expect(session.guards().rescueHandle).toBe('open');
    expect(session.set('rescueHandle', 'pulled')).toEqual({ applied: true });
  });

  it('only confirms the safety pin is out before the handle is pulled', () => {
    const pin = itemIndex(
      'rescueDeployment',
      (item) => item.type === 'confirm' && /safety pin out/i.test(item.text.en),
    );
    expect(pin).toBeLessThan(actionOn('rescueDeployment', 'rescueHandle', 'pulled'));
  });

  const flareShutdown = [
    ['ignition', 'off'],
    ['fuelValve', 'closed'],
    ['brake', 'on'],
    ['elt', 'on'],
  ] as const;

  it.each([
    [
      'engineFire',
      [
        ['fuelValve', 'closed'],
        ['throttle', 'full'],
        ['ignition', 'off'],
      ],
    ],
    [
      'oilLoss',
      [
        ['ignition', 'off'],
        ['fuelValve', 'closed'],
      ],
    ],
    ['engineFailureLow', flareShutdown],
    ['engineFailureRestart', flareShutdown],
  ] as const)('%s has its shutdown actions in order', (id, steps) => {
    const indices = steps.map(([control, position]) => actionOn(id, control, position));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
    expect(new Set(indices).size).toBe(indices.length);
  });

  it.each([
    ['generatorFailure', 'generator', 'in'],
    ['engineFailureLow', 'elt', 'on'],
    ['engineFailureRestart', 'elt', 'on'],
    ['engineFire', 'fuelValve', 'closed'],
    ['coolantLoss', 'throttle', 'low'],
    ['oilLoss', 'elt', 'on'],
    ['flapControlFailure', 'flapSelector', 'override-up'],
    ['rescueDeployment', 'rescueHandle', 'pulled'],
  ] as const)('%s fails without its %s %s step', (id, control, position) => {
    const result = walkProcedure(withoutItem(id, actionOn(id, control, position)), id, {
      devices,
    });
    expect(result.ok).toBe(false);
  });

  describe('model reactions', () => {
    const inject = (id: string) => {
      const session = createSession(ctslAircraft, { devices, phase: procedure(id).startPhase });
      session.startProcedure(id);
      return session;
    };

    it('keeps an engine stoppage from restarting on the starter', () => {
      const session = inject('engineFailureRestart');
      session.press('ignition', 'start');
      run(session, 3000);
      session.release('ignition');
      expect(systems(session).engine.running).toBe(false);
    });

    it('puts the fire out once the valve is closed and the engine has stopped', () => {
      const session = inject('engineFire');
      expect(systems(session).fire).toBe(true);
      session.set('fuelValve', 'closed');
      session.set('throttle', 'full');
      run(session, 10_000);
      expect(systems(session).engine.running).toBe(false);
      expect(systems(session).fire).toBe(false);
    });

    it('keeps the fire burning with the valve open', () => {
      const session = inject('engineFire');
      session.set('throttle', 'full');
      run(session, 10_000);
      expect(systems(session).fire).toBe(true);
    });

    it('holds the CHT above the red line at cruise power after a coolant loss', () => {
      const session = inject('coolantLoss');
      run(session, 60_000);
      expect(systems(session).chtC).toBeGreaterThan(120);
    });

    it('keeps the charge lamp lit after the generator is reset', () => {
      const session = inject('generatorFailure');
      session.set('generator', 'pulled');
      session.set('generator', 'in');
      run(session, 1000);
      expect(systems(session).bus.charging).toBe(false);
      expect(systems(session).bus.mainPowered).toBe(true);
    });

    it('lets the flaps stop at full negative only with the control failed', () => {
      const session = inject('flapControlFailure');
      session.set('flapSelector', 'override-up');
      run(session, 2000);
      session.set('flapSelector', '-12');
      run(session, 2000);
      expect(systems(session).flaps.angle).toBeLessThan(-12);
      expect(systems(session).flaps.moving).toBe(false);
    });
  });
});

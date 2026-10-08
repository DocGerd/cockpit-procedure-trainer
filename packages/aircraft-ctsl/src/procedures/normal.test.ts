import { createSession, walkProcedure } from '@cpt/core';
import type { Aircraft, ProcedureItem } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { controls } from '../controls';
import { ctslAircraft } from '../index';
import { testDevices } from '../test-devices';
import { headingLabel, runway } from '../airfield';
import { normalProcedures } from './normal';

const devices = testDevices;

const expected = [
  ['preflight', 'parking', undefined],
  ['engineStart', 'parking', 'taxiOut'],
  ['taxi', 'taxiOut', 'holding'],
  ['beforeTakeoff', 'holding', undefined],
  ['takeoff', 'linedUp', 'departure'],
  ['shortTakeoff', 'linedUp', 'departure'],
  ['climbCruise', 'departure', 'cruise'],
  ['descent', 'cruise', 'approach'],
  ['beforeLanding', 'approach', undefined],
  ['landing', 'approach', 'landing'],
  ['goAround', 'landing', 'departure'],
  ['afterLanding', 'taxiIn', undefined],
  ['shutdown', 'parkingSecuring', undefined],
] as const;

const runwayHeadingCheck = `Compass reads ${headingLabel(runway.headingDeg)}°, the heading of runway ${runway.designator} (trainer addition)`;

// Checks that verify the entry snapshot (intake §5) rather than an earlier action of the same
// procedure, keyed by procedure and English item text.
const snapshotChecks: Record<string, readonly string[]> = {
  engineStart: [
    'Brake lever released, parking brake holds',
    'All breakers in',
    'Flap readout shows 0°',
  ],
  taxi: ['Parking brake released'],
  takeoff: [runwayHeadingCheck, 'Flap readout shows 15°'],
  shortTakeoff: [runwayHeadingCheck, 'Flap readout shows 15°'],
  beforeTakeoff: [
    'Brake lever released, parking brake holds',
    'Oil pressure in the green',
    'Oil temperature below the red line',
    'Cylinder head temperature in the green',
    'Oil temperature at least 51 °C',
    'Charge lamp out',
  ],
  climbCruise: [
    'Rpm at most 5500',
    'Oil pressure in the green',
    'Oil temperature in the green',
    'Cylinder head temperature in the green',
  ],
};

type Item = ProcedureItem<unknown>;

const procedures = Object.entries(ctslAircraft.procedures).filter(([id]) => id in normalProcedures);

const isFlow = (item: Item) => item.type === 'action' && item.flow === true;

// A flow item sets what a later action sets again, so the two stand or fall together.
const twins = (items: readonly Item[], index: number) => {
  const action = items[index];
  if (action?.type !== 'action') return [index];
  return items.flatMap((item, i) =>
    i === index ||
    (isFlow(item) &&
      item.type === 'action' &&
      item.control === action.control &&
      item.position === action.position)
      ? [i]
      : [],
  );
};

const withoutItems = (id: string, indices: readonly number[]): Aircraft => {
  const procedure = ctslAircraft.procedures[id];
  if (!procedure) throw new Error(`no procedure ${id}`);
  return {
    ...ctslAircraft,
    procedures: {
      ...ctslAircraft.procedures,
      [id]: { ...procedure, items: procedure.items.filter((_, i) => !indices.includes(i)) },
    },
  } as Aircraft;
};

const without = (id: string, index: number): Aircraft => withoutItems(id, [index]);

const checksOf = (id: string) =>
  (ctslAircraft.procedures[id]?.items ?? [])
    .map((item, index) => ({ item: item as Item, index }))
    .filter(({ item }) => item.type === 'check');

const actionsBefore = (id: string, index: number) =>
  (ctslAircraft.procedures[id]?.items ?? [])
    .map((item, i) => ({ item: item as Item, i }))
    .filter(({ item, i }) => item.type === 'action' && !isFlow(item) && i < index)
    .map(({ i }) => i);

const failsAt = (aircraft: Aircraft, id: string, index: number) => {
  const result = walkProcedure(aircraft, id, { devices });
  return !result.ok && result.itemIndex === index && result.reason === 'condition not met';
};

/** Whether the check at `check` fails once the action at `action`, with its flow twin, is gone. */
const failsWithout = (id: string, action: number, check: number) => {
  const removed = twins((ctslAircraft.procedures[id]?.items ?? []) as readonly Item[], action);
  return failsAt(withoutItems(id, removed), id, check - removed.length);
};

describe('CTSL normal procedures', () => {
  it('has exactly the procedures of the plan with their phases', () => {
    expect(Object.keys(normalProcedures).sort()).toEqual(expected.map(([id]) => id).sort());
    for (const [id, startPhase, endPhase] of expected) {
      const procedure = ctslAircraft.procedures[id];
      expect(procedure?.type, id).toBe('normal');
      expect(procedure?.startPhase, id).toBe(startPhase);
      expect(procedure?.endPhase, id).toBe(endPhase);
    }
  });

  it('keeps the brake and steering checks out of the engine start and in the taxi', () => {
    const confirms = (id: string) =>
      (ctslAircraft.procedures[id]?.items ?? []).flatMap((item) =>
        item.type === 'confirm' ? [item.text.en] : [],
      );
    expect(confirms('engineStart')).not.toContain('Brakes checked');
    expect(confirms('engineStart')).not.toContain('Nose-wheel steering checked');
    expect(confirms('taxi')).toEqual(['Brakes checked', 'Nose-wheel steering checked']);
  });

  it('titles the taxi procedure after its phase', () => {
    expect(ctslAircraft.procedures.taxi?.title).toEqual({
      de: 'Rollen zum Rollhalt',
      en: 'Taxi out',
    });
  });

  it('states the handbook revision the procedures follow', () => {
    expect(ctslAircraft.handbookRevision.en).toContain('AE04300003, revision 01');
    expect(ctslAircraft.handbookRevision.de).toContain('AE04300003, Revision 01');
  });

  it.each(expected.map(([id]) => id))('%s completes with no deviations', (id) => {
    expect(walkProcedure(ctslAircraft, id, { devices })).toEqual({ ok: true });
  });

  it('beforeTakeoff stops at choke and carb heat, already off, until the pilot verifies each', () => {
    const items = normalProcedures.beforeTakeoff.items as readonly Item[];
    const indexOf = (control: string) =>
      items.findIndex(
        (item) => !isFlow(item) && item.type === 'action' && item.control === control,
      );
    const choke = indexOf('choke');
    const carbHeat = indexOf('carbHeat');
    expect(carbHeat).toBe(choke + 1);

    const session = createSession(ctslAircraft, { devices, phase: 'holding' });
    session.startProcedure('beforeTakeoff');
    expect(session.state().controls).toMatchObject({ choke: 'off', carbHeat: 'off' });
    for (
      let at = session.checklist()?.current ?? 0;
      at < choke;
      at = session.checklist()?.current ?? choke
    ) {
      const item = items[at] as Item;
      if (item.type === 'action' && ctslAircraft.controls[item.control]?.kind === 'momentary') {
        session.press(item.control);
        session.release(item.control);
      } else if (
        item.type === 'action' &&
        session.state().controls[item.control] !== item.position
      ) {
        session.set(item.control, item.position);
      } else {
        session.checkOff();
      }
    }
    expect(session.checklist()?.current).toBe(choke);
    session.advance(1000);
    expect(session.checklist()?.current).toBe(choke);

    session.checkOff();
    expect(session.checklist()?.current).toBe(carbHeat);
    session.checkOff();
    expect(session.checklist()?.current).toBe(carbHeat + 1);
    expect(session.checklist()?.deviations).toEqual([]);
  });

  describe('flows (assumed, intake §9 question 30)', () => {
    const flows = {
      engineStart: ['avionicsMaster', 'beacon', 'fuelValve', 'battery', 'carbHeat'],
      beforeTakeoff: ['flapSelector', 'choke', 'trim', 'carbHeat'],
      afterLanding: ['landingLight', 'flapSelector', 'carbHeat'],
    } as const;

    it('opens only the procedures where a panel scan comes first with a flow', () => {
      const opening = Object.entries(normalProcedures)
        .filter(([, procedure]) => isFlow(procedure.items[0] as Item))
        .map(([id]) => id)
        .sort();
      expect(opening).toEqual(Object.keys(flows).sort());
    });

    it.each(Object.entries(flows))('%s scans its controls in panel order', (id, controls) => {
      const items = normalProcedures[id as keyof typeof flows].items as readonly Item[];
      const flow = items.filter(isFlow);
      expect(flow.map((item) => item.type === 'action' && item.control)).toEqual(controls);
    });

    it.each(Object.keys(flows))('%s leaves part of its flow to do at the start', (id) => {
      const procedure = ctslAircraft.procedures[id];
      if (!procedure) throw new Error(`no procedure ${id}`);
      const session = createSession(ctslAircraft, { devices, phase: procedure.startPhase });
      session.startProcedure(id);
      const flow = procedure.items.filter((item) => isFlow(item as Item));
      expect(session.checklist()?.completed.length).toBeLessThan(flow.length);
    });
  });

  describe('parking brake in shutdown, in the intake order', () => {
    const items = normalProcedures.shutdown.items as readonly Item[];
    const valve = items.findIndex(
      (item) =>
        item.type === 'action' &&
        item.control === 'parkingBrakeValve' &&
        item.position === 'closed',
    );

    const atValve = () => {
      const session = createSession(ctslAircraft, { devices, phase: 'parkingSecuring' });
      session.startProcedure('shutdown');
      for (let at = 0; at < valve; at += 1) {
        const item = items[at] as Item;
        if (item.type === 'action') session.set(item.control, item.position);
        else session.checkOff();
      }
      expect(session.checklist()?.current).toBe(valve);
      session.set('parkingBrakeValve', 'closed');
      return session;
    };

    it('closes the valve, holds the lever, then checks the lever released', () => {
      expect(items.slice(valve, valve + 3).map((item) => item.text.en)).toEqual([
        'Parking-brake valve closed',
        'Brake lever pulled and held',
        'Brake lever released, parking brake holds',
      ]);
    });

    it('completes the lever item with the lever held', () => {
      const session = atValve();
      expect(session.checklist()?.current).toBe(valve + 1);
      session.press('brake');
      expect(session.checklist()?.current).toBe(valve + 2);
    });

    it('fails the hold check while the lever is still held', () => {
      const session = atValve();
      session.press('brake');
      session.checkOff();
      expect(session.checklist()?.deviations).toEqual([
        expect.objectContaining({ kind: 'unmet-check', itemIndex: valve + 2 }),
      ]);
    });

    it('passes the hold check once the lever springs back', () => {
      const session = atValve();
      session.press('brake');
      session.release('brake');
      expect(session.state().controls.brake).toBe('off');
      session.checkOff();
      expect(session.checklist()?.current).toBe(valve + 3);
      expect(session.checklist()?.deviations).toEqual([]);
    });
  });

  it('releases the parking brake at the valve alone and checks it is off', () => {
    const items = normalProcedures.beforeTakeoff.items as readonly Item[];
    const open = items.findIndex(
      (item) =>
        item.type === 'action' && item.control === 'parkingBrakeValve' && item.position === 'open',
    );
    expect(items.slice(open).map((item) => item.text.en)).toEqual([
      'Parking-brake valve open',
      'Parking brake released',
    ]);
  });

  it('asks for the run-up rpm as a challenge and takes the reading as the response', () => {
    const check = (normalProcedures.beforeTakeoff.items as readonly Item[]).find(
      (item) => item.type === 'check' && item.response !== undefined,
    );
    expect(check?.text.en).not.toMatch(/\d/);
    expect(check?.text.de).not.toMatch(/\d/);
  });

  it('engineStart needs its ignition BOTH step because the engine starts with the key off', () => {
    const items = normalProcedures.engineStart.items as readonly Item[];
    const toBoth = items.findIndex(
      (item) => item.type === 'action' && item.control === 'ignition' && item.position === 'both',
    );
    expect(toBoth).toBeGreaterThanOrEqual(0);
    const result = walkProcedure(without('engineStart', toBoth), 'engineStart', { devices });
    expect(result).toMatchObject({ ok: false, reason: expect.stringMatching(/needs it at both/) });
  });

  const ignitionAt = (id: keyof typeof normalProcedures, position: string) =>
    (normalProcedures[id].items as readonly Item[]).findIndex(
      (item) => item.type === 'action' && item.control === 'ignition' && item.position === position,
    );
  const actionAt = (id: keyof typeof normalProcedures, control: string, position: string) =>
    (normalProcedures[id].items as readonly Item[]).findIndex(
      (item) => item.type === 'action' && item.control === control && item.position === position,
    );

  it('engineStart inserts the key, once the fuel valve is open, before turning it to BOTH', () => {
    const keyIn = ignitionAt('engineStart', 'off');
    expect(ctslAircraft.phases.parking?.entry.controls.ignition).toBe('out');
    expect(keyIn).toBeGreaterThan(actionAt('engineStart', 'fuelValve', 'open'));
    expect(keyIn).toBeLessThan(ignitionAt('engineStart', 'both'));
    const session = createSession(ctslAircraft, { devices, phase: 'parking' });
    expect(session.set('ignition', 'off')).toEqual({ applied: false, reason: 'locked' });
    session.set('fuelValve', 'open');
    expect(session.set('ignition', 'off')).toEqual({ applied: true });
  });

  it('engineStart takes the key in and round to BOTH one detent at a time, with no deviation', () => {
    const items = normalProcedures.engineStart.items as readonly Item[];
    const toBoth = ignitionAt('engineStart', 'both');
    const detents = controls.ignition.positions as readonly string[];
    const session = createSession(ctslAircraft, { devices, phase: 'parking' });
    session.startProcedure('engineStart');
    // A flow completes in any order, so the walk follows the engine's current item.
    for (
      let at = session.checklist()?.current ?? 0;
      at <= toBoth;
      at = session.checklist()?.current ?? toBoth + 1
    ) {
      const item = items[at] as Item;
      if (item.type !== 'action') session.checkOff();
      else if (session.state().controls[item.control] === item.position) session.checkOff();
      else if (ctslAircraft.controls[item.control]?.kind === 'momentary') {
        session.press(item.control);
        session.release(item.control);
      } else if (item.control !== 'ignition') session.set(item.control, item.position);
      else {
        const from = detents.indexOf(String(session.state().controls.ignition));
        for (const detent of detents.slice(from + 1, detents.indexOf(String(item.position)) + 1)) {
          expect(session.set('ignition', detent), detent).toEqual({ applied: true });
        }
      }
    }
    expect(session.checklist()?.current).toBe(toBoth + 1);
    expect(session.checklist()?.deviations).toEqual([]);
  });

  it('preflight confirms the key out without inserting it', () => {
    expect(ignitionAt('preflight', 'off')).toBe(-1);
    expect(ignitionAt('preflight', 'out')).toBeGreaterThanOrEqual(0);
  });

  it('shutdown closes the fuel valve before the key comes out, leaving it as parking has it', () => {
    const valve = actionAt('shutdown', 'fuelValve', 'closed');
    const keyOut = ignitionAt('shutdown', 'out');
    expect(ignitionAt('shutdown', 'off')).toBeLessThan(valve);
    expect(valve).toBeLessThan(keyOut);
    expect(ctslAircraft.phases.parking?.entry.controls).toMatchObject({
      fuelValve: 'closed',
      ignition: 'out',
    });
    const session = createSession(ctslAircraft, { devices, phase: 'parkingSecuring' });
    session.set('ignition', 'off');
    expect(session.set('ignition', 'out')).toEqual({ applied: false, reason: 'locked' });
    session.set('fuelValve', 'closed');
    expect(session.set('ignition', 'out')).toEqual({ applied: true });
  });

  it.each(['takeoff', 'shortTakeoff'] as const)(
    'starts %s lined up with a compass check against the runway heading',
    (id) => {
      const first = normalProcedures[id].items[0] as Item;
      if (first.type !== 'check') throw new Error(`${id} opens with a ${first.type}`);
      expect(first.target).toEqual({ indicator: 'compass' });
      const facing = (phase: string) => createSession(ctslAircraft, { devices, phase }).state();
      expect(first.condition(facing('linedUp'))).toBe(true);
      expect(first.condition(facing('holding'))).toBe(false);
      expect(first.text.en).toContain(headingLabel(runway.headingDeg));
      expect(first.text.en).toContain(`runway ${runway.designator}`);
      expect(first.text.de).toContain(headingLabel(runway.headingDeg));
      expect(first.text.de).toContain(`Piste ${runway.designator}`);
    },
  );

  it('enters departure with the flaps where the take-off leaves them', () => {
    const flapActions = (normalProcedures.takeoff.items as readonly Item[]).filter(
      (item) => item.type === 'action' && item.control === 'flapSelector',
    );
    const last = flapActions.at(-1);
    expect(last?.type === 'action' && last.position).toBe(
      ctslAircraft.phases.departure?.entry.controls.flapSelector,
    );
  });

  it('selects negative flap in the climb only after confirming a safe height', () => {
    const items = normalProcedures.climbCruise.items as readonly Item[];
    const safeHeight = items.findIndex(
      (item) => item.type === 'confirm' && /safe height/i.test(item.text.en),
    );
    const negative = items.findIndex(
      (item) =>
        item.type === 'action' && item.control === 'flapSelector' && item.position === '-12',
    );
    expect(safeHeight).toBeGreaterThanOrEqual(0);
    expect(safeHeight).toBeLessThan(negative);
  });

  it('never targets a continuous lever', () => {
    const definitions: Record<string, { readonly positions: unknown }> = controls;
    for (const [id, procedure] of procedures) {
      for (const item of procedure.items as readonly Item[]) {
        if (item.type !== 'action') continue;
        expect(definitions[item.control]?.positions, `${id}: ${item.text.en}`).not.toBe(
          'continuous',
        );
      }
    }
  });

  describe('every check is established by an earlier action', () => {
    const cases = procedures.flatMap(([id]) =>
      checksOf(id)
        .filter(({ item }) => !snapshotChecks[id]?.includes(item.text.en))
        .map(({ item, index }) => [id, index, item.text.en] as const),
    );

    it.each(cases)('%s item %i "%s" fails without it', (id, index) => {
      const establishing = actionsBefore(id, index).filter((k) => failsWithout(id, k, index));
      expect(establishing.length).toBeGreaterThan(0);
    });
  });

  describe('snapshot checks', () => {
    const cases = Object.entries(snapshotChecks).flatMap(([id, texts]) =>
      texts.map((text) => [id, text] as const),
    );

    it.each(cases)('%s "%s" holds on entry and no action establishes it', (id, text) => {
      const procedure = ctslAircraft.procedures[id];
      const found = checksOf(id).find(({ item }) => item.text.en === text);
      expect(found, text).toBeDefined();
      if (!procedure || !found || found.item.type !== 'check') return;
      const session = createSession(ctslAircraft, { devices, phase: procedure.startPhase });
      expect(found.item.condition(session.state())).toBe(true);
      for (const k of actionsBefore(id, found.index)) {
        expect(failsWithout(id, k, found.index), `without item ${k}`).toBe(false);
      }
    });
  });
});

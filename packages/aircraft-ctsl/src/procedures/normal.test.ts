import { createSession, walkProcedure } from '@cpt/core';
import type { Aircraft, ProcedureItem } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { controls } from '../controls';
import { ctslAircraft } from '../index';
import { testDevices } from '../test-devices';
import { normalProcedures } from './normal';

const devices = testDevices;

const expected = [
  ['preflight', 'parking', undefined],
  ['engineStart', 'parking', undefined],
  ['beforeTakeoff', 'holding', undefined],
  ['takeoff', 'holding', 'departure'],
  ['shortTakeoff', 'holding', 'departure'],
  ['climbCruise', 'departure', 'cruise'],
  ['descent', 'cruise', 'approach'],
  ['beforeLanding', 'approach', undefined],
  ['landing', 'approach', 'landing'],
  ['goAround', 'landing', 'departure'],
  ['afterLanding', 'taxiIn', undefined],
  ['shutdown', 'parkingSecuring', undefined],
] as const;

// Checks that verify the entry snapshot (intake §5) rather than an earlier action of the same
// procedure, keyed by procedure and English item text.
const snapshotChecks: Record<string, readonly string[]> = {
  engineStart: ['All breakers in', 'Flap readout shows 0°'],
  beforeTakeoff: [
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

const without = (id: string, index: number): Aircraft => {
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

const checksOf = (id: string) =>
  (ctslAircraft.procedures[id]?.items ?? [])
    .map((item, index) => ({ item: item as Item, index }))
    .filter(({ item }) => item.type === 'check');

const actionsBefore = (id: string, index: number) =>
  (ctslAircraft.procedures[id]?.items ?? [])
    .map((item, i) => ({ item: item as Item, i }))
    .filter(({ item, i }) => item.type === 'action' && i < index)
    .map(({ i }) => i);

const failsAt = (aircraft: Aircraft, id: string, index: number) => {
  const result = walkProcedure(aircraft, id, { devices });
  return !result.ok && result.itemIndex === index && result.reason === 'condition not met';
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

  it('states the handbook revision the procedures follow', () => {
    expect(ctslAircraft.handbookRevision).toContain('AE04300003, revision 01');
  });

  it.each(expected.map(([id]) => id))('%s completes with no deviations', (id) => {
    expect(walkProcedure(ctslAircraft, id, { devices })).toEqual({ ok: true });
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
      const establishing = actionsBefore(id, index).filter((k) =>
        failsAt(without(id, k), id, index - 1),
      );
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
        expect(failsAt(without(id, k), id, found.index - 1), `without item ${k}`).toBe(false);
      }
    });
  });
});

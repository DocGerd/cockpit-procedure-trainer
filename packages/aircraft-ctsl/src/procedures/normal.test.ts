import { createSession, deviceControls, walkProcedure } from '@cpt/core';
import type { Aircraft, ProcedureItem, Session } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { controls } from '../controls';
import { ctslAircraft } from '../index';
import { testDevices } from '../test-devices';
import { normalProcedures } from './normal';

const devices = testDevices;
const allControls = { ...ctslAircraft.controls, ...deviceControls(ctslAircraft, devices) };

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

// Checks that verify the entry snapshot (intake §5) rather than an earlier action of the same
// procedure, keyed by procedure and English item text.
const snapshotChecks: Record<string, readonly string[]> = {
  engineStart: [
    'Parking brake: holds, brake lever released',
    'Breakers: all in',
    'Flap readout: 0°',
  ],
  taxi: ['Parking brake: released'],
  takeoff: ['Flap readout: 15°'],
  shortTakeoff: ['Flap readout: 15°'],
  beforeTakeoff: [
    'Parking brake: holds, brake lever released',
    'Oil pressure: 2 to 5 bar',
    'Oil temperature: below the red line',
    'Cylinder head temperature: below the red line',
    'Oil temperature: at least 51 °C',
    'Generator lamp: out',
    'GPS: position fix (3D GPS Location)',
  ],
  climbCruise: [
    'Rpm: at most 5500 rpm',
    'Oil pressure: 2 to 5 bar',
    'Oil temperature: in the green',
    'Cylinder head temperature: in the green',
  ],
};

type Item = ProcedureItem<unknown>;

/** An item's English text as the checklist shows it once ticked: a check's challenge and value. */
const said = (item: Item) =>
  item.type === 'check' && item.expected ? `${item.text.en}: ${item.expected.en}` : item.text.en;

const procedures = Object.entries(ctslAircraft.procedures).filter(([id]) => id in normalProcedures);

const isFlow = (item: Item) => item.type === 'action' && item.flow === true;

// Completes items in the engine's order until the cursor reaches `stop`, failing on an item that
// does not advance instead of spinning.
const walkTo = (session: Session, items: readonly Item[], stop: number) => {
  for (let guard = 0; guard <= items.length; guard++) {
    const at = session.checklist()?.current;
    if (at === undefined) throw new Error('the procedure is no longer running');
    if (at >= stop) return;
    const item = items[at] as Item;
    const definition = item.type === 'action' ? allControls[item.control] : undefined;
    if (item.type === 'action' && definition?.kind === 'momentary') {
      session.press(item.control);
      session.release(item.control);
    } else if (
      item.type === 'action' &&
      definition?.kind === 'rotary' &&
      typeof item.position === 'string' &&
      definition.springBack !== undefined &&
      Object.hasOwn(definition.springBack, item.position)
    ) {
      session.press(item.control, item.position);
      session.release(item.control);
    } else if (item.type === 'action' && session.state().controls[item.control] !== item.position) {
      session.set(item.control, item.position);
    } else {
      session.checkOff();
    }
    if (session.checklist()?.current === at) throw new Error(`item ${at} did not advance`);
  }
  throw new Error(`the walk did not reach item ${stop}`);
};

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
    walkTo(session, items, choke);
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
      beforeTakeoff: ['flapSelector', 'trim', 'choke', 'carbHeat'],
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

  describe('trim in steps before take-off', () => {
    const items = normalProcedures.beforeTakeoff.items as readonly Item[];
    const trimStep = items.findIndex(
      (item) => !isFlow(item) && item.type === 'action' && item.control === 'trim',
    );

    it.each(['nose-down', 'half-down', 'half-up', 'nose-up'])(
      'holds the trim step stepping out to %s and back, and completes it at neutral with no trim deviation',
      (position) => {
        const session = createSession(ctslAircraft, { devices, phase: 'holding' });
        session.startProcedure('beforeTakeoff');
        walkTo(session, items, trimStep);
        const walked = session.checklist()?.deviations;
        const stops = controls.trim.positions as readonly string[];
        const [neutral, target] = [stops.indexOf('neutral'), stops.indexOf(position)];
        const away = target < neutral ? -1 : 1;
        for (let at = neutral + away; at !== target + away; at += away) {
          expect(session.set('trim', stops[at] as string), stops[at]).toEqual({ applied: true });
          expect(session.checklist()?.current).toBe(trimStep);
        }
        for (let at = target - away; at !== neutral; at -= away) {
          session.set('trim', stops[at] as string);
          expect(session.checklist()?.current, stops[at]).toBe(trimStep);
        }
        session.set('trim', 'neutral');
        expect(session.checklist()?.current).toBe(trimStep + 1);
        expect(session.checklist()?.deviations).toEqual(walked);
      },
    );
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
      expect(items.slice(valve, valve + 3).map(said)).toEqual([
        'Parking-brake valve On',
        'Brake lever pulled and held',
        'Parking brake: holds, brake lever released',
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
    expect(items.slice(open).map(said)).toEqual([
      'Parking-brake valve Off',
      'Parking brake: released',
    ]);
  });

  const allChecks = procedures.flatMap(([id]) =>
    checksOf(id).map(({ item }) => [id, said(item), item] as const),
  );

  it.each(allChecks)('%s "%s" names what to read and keeps the value back', (_, __, item) => {
    if (item.type !== 'check') throw new Error('not a check');
    expect(item.expected).toBeDefined();
    expect(item.text.en).not.toMatch(/\d/);
    expect(item.text.de).not.toMatch(/\d/);
  });

  it('takes a reading on every flap, oil and cylinder head check', () => {
    const read = ['flapReadout', 'oilPressure', 'oilTemperature', 'cht'];
    const unread = allChecks.filter(
      ([, , item]) =>
        item.type === 'check' &&
        item.target !== undefined &&
        'indicator' in item.target &&
        read.includes(item.target.indicator) &&
        item.response === undefined,
    );
    expect(unread.map(([id, text]) => `${id}: ${text}`)).toEqual([]);
  });

  it('takes an rpm reading on every tachometer check but the magneto drops', () => {
    const unread = allChecks.filter(
      ([, , item]) =>
        item.type === 'check' &&
        item.target !== undefined &&
        'indicator' in item.target &&
        item.target.indicator === 'tachometer' &&
        item.response === undefined,
    );
    expect(unread.map(([, , item]) => item.text.en)).toEqual(['Rpm drop', 'Rpm drop']);
  });

  it('engineStart needs its ignition 1+2 step because the engine starts with the key off', () => {
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

  it('engineStart inserts the key, once the fuel valve is open, before turning it to 1+2', () => {
    const keyIn = ignitionAt('engineStart', 'off');
    expect(ctslAircraft.phases.parking?.entry.controls.ignition).toBe('out');
    expect(keyIn).toBeGreaterThan(actionAt('engineStart', 'fuelValve', 'open'));
    expect(keyIn).toBeLessThan(ignitionAt('engineStart', 'both'));
    const session = createSession(ctslAircraft, { devices, phase: 'parking' });
    expect(session.set('ignition', 'off')).toEqual({ applied: false, reason: 'locked' });
    session.set('fuelValve', 'open');
    expect(session.set('ignition', 'off')).toEqual({ applied: true });
  });

  it('engineStart takes the key in and round to 1+2 one detent at a time, with no deviation', () => {
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

  it('engineStart leaves the intercom on, as the taxi-out phase starts it (§9 question 32)', () => {
    let intercom: unknown;
    walkProcedure(ctslAircraft, 'engineStart', {
      devices,
      afterChecklist: (session) => {
        intercom = session.state().controls.intercom;
      },
    });
    expect(intercom).toBe('on');
    expect(ctslAircraft.phases.taxiOut?.entry.controls.intercom).toBe('on');
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
    'opens %s with the flaps, as the panel has no compass',
    (id) => {
      const first = normalProcedures[id].items[0] as Item;
      expect(first).toMatchObject({ type: 'action', control: 'flapSelector', position: '15' });
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
        .filter(({ item }) => !snapshotChecks[id]?.includes(said(item)))
        .map(({ item, index }) => [id, index, said(item)] as const),
    );

    it.each(cases)('%s item %i "%s" fails without it', (id, index) => {
      const establishing = actionsBefore(id, index).filter((k) => failsWithout(id, k, index));
      expect(establishing.length).toBeGreaterThan(0);
    });
  });

  describe('CHT checks follow the dial (#776)', () => {
    const verdict = (id: string, text: string, chtC: number) => {
      const found = checksOf(id).find(({ item }) => said(item) === text);
      expect(found, text).toBeDefined();
      if (!found || found.item.type !== 'check') return undefined;
      const state = createSession(ctslAircraft, { devices, phase: 'cruise' }).state();
      return found.item.condition({ ...state, systems: { ...(state.systems as object), chtC } });
    };
    const green = 'Cylinder head temperature: in the green';
    const belowRedLine = 'Cylinder head temperature: below the red line';

    it.each([
      [80, false],
      [89, false],
      [90, true],
      [110, true],
      [115, false],
    ])('climbCruise: "in the green" at %i C is %s', (chtC, met) => {
      expect(verdict('climbCruise', green, chtC)).toBe(met);
    });

    it.each([
      [70, true],
      [86, true],
      [119, true],
      [120, false],
    ])('beforeTakeoff: "below the red line" at %i C is %s', (chtC, met) => {
      expect(verdict('beforeTakeoff', belowRedLine, chtC)).toBe(met);
    });
  });

  describe('snapshot checks', () => {
    const cases = Object.entries(snapshotChecks).flatMap(([id, texts]) =>
      texts.map((text) => [id, text] as const),
    );

    it.each(cases)('%s "%s" holds on entry and no action establishes it', (id, text) => {
      const procedure = ctslAircraft.procedures[id];
      const found = checksOf(id).find(({ item }) => said(item) === text);
      expect(found, text).toBeDefined();
      if (!procedure || !found || found.item.type !== 'check') return;
      const session = createSession(ctslAircraft, { devices, phase: procedure.startPhase });
      expect(found.item.condition(session.state())).toBe(true);
      for (const k of actionsBefore(id, found.index)) {
        expect(failsWithout(id, k, found.index), `without item ${k}`).toBe(false);
      }
    });
  });

  describe('items that state panel or device state are checks (#473)', () => {
    const only = (id: string, texts: readonly string[]): Aircraft => {
      const procedure = ctslAircraft.procedures[id];
      if (!procedure) throw new Error(`no procedure ${id}`);
      return {
        ...ctslAircraft,
        procedures: {
          ...ctslAircraft.procedures,
          [id]: {
            ...procedure,
            items: procedure.items.filter((item) => texts.includes(said(item as Item))),
          },
        },
      } as Aircraft;
    };

    const tickedAt = (aircraft: Aircraft, id: string, prepare: (session: Session) => void) => {
      const session = createSession(aircraft, {
        devices,
        phase: ctslAircraft.procedures[id]?.startPhase ?? '',
      });
      session.startProcedure(id);
      session.advance(100);
      prepare(session);
      session.checkOff();
      return session.checklist()?.deviations ?? [];
    };

    describe('Transponder: on, standby', () => {
      const aircraft = only('beforeTakeoff', ['Transponder: on, standby']);
      const tick = (prepare: (session: Session) => void) =>
        tickedAt(aircraft, 'beforeTakeoff', prepare);

      const tap = (session: Session, control: string) => {
        session.press(control);
        session.release(control);
      };

      it('is a check on the transponder, after the I/O press that switches it on', () => {
        const items = normalProcedures.beforeTakeoff.items as readonly Item[];
        const at = items.findIndex((item) => said(item) === 'Transponder: on, standby');
        expect(items[at]).toMatchObject({ type: 'check', target: { control: 'xpdr.power' } });
        expect(items[at - 1]).toMatchObject({
          type: 'action',
          control: 'xpdr.power',
          position: 'pressed',
        });
      });

      it('records an unmet check when ticked with the transponder off, although it rests in STBY', () => {
        expect(tick(() => {})).toEqual([expect.objectContaining({ kind: 'unmet-check' })]);
      });

      it('records an unmet check when ticked at standby without avionics power', () => {
        expect(
          tick((session) => {
            tap(session, 'xpdr.power');
            session.set('avionicsMaster', 'off');
            session.advance(100);
          }),
        ).toContainEqual(expect.objectContaining({ kind: 'unmet-check' }));
      });

      it('records an unmet check when ticked at ACS', () => {
        expect(
          tick((session) => {
            tap(session, 'xpdr.power');
            tap(session, 'xpdr.mode');
          }),
        ).toContainEqual(expect.objectContaining({ kind: 'unmet-check' }));
      });

      it('records nothing when ticked at standby with power', () => {
        expect(tick((session) => tap(session, 'xpdr.power'))).toEqual([]);
      });
    });

    describe('COM radio: on (intake §9 question 35)', () => {
      const aircraft = only('engineStart', ['COM radio: on']);
      const tick = (phase: string) => {
        const session = createSession(aircraft, { devices, phase });
        session.startProcedure('engineStart');
        session.checkOff();
        return session.checklist()?.deviations ?? [];
      };

      it('is a check on the radio, after the I/O press that switches it on, right after the Avionics Master', () => {
        const items = normalProcedures.engineStart.items as readonly Item[];
        const at = items.findIndex((item) => said(item) === 'COM radio: on');
        expect(items[at]).toMatchObject({ type: 'check', target: { control: 'com.power' } });
        expect(items[at - 1]).toMatchObject({
          type: 'action',
          control: 'com.power',
          position: 'pressed',
        });
        expect(items[at - 2]).toMatchObject({ control: 'avionicsMaster', position: 'on' });
        expect(items[at + 1]).toMatchObject({ control: 'intercom', position: 'on' });
      });

      it('is unmet with the Avionics Master on and no I/O press, and met once I/O is pressed', () => {
        const items = normalProcedures.engineStart.items as readonly Item[];
        const press = items.findIndex(
          (item) => item.type === 'action' && item.control === 'com.power',
        );
        expect(press).toBeGreaterThan(0);
        expect(failsAt(without('engineStart', press), 'engineStart', press)).toBe(true);
        expect(failsAt(ctslAircraft, 'engineStart', press + 1)).toBe(false);
      });

      it('is not repeated in the run-up, which only confirms the radio set', () => {
        const items = normalProcedures.beforeTakeoff.items as readonly Item[];
        expect(items.some((item) => 'control' in item && item.control === 'com.power')).toBe(false);
      });

      it('records an unmet check when ticked with the radio dark, as at engine start', () => {
        expect(tick('parking')).toEqual([expect.objectContaining({ kind: 'unmet-check' })]);
      });

      it('passes when the walk presses I/O after the Avionics Master', () => {
        let on: unknown;
        const result = walkProcedure(ctslAircraft, 'engineStart', {
          devices,
          afterChecklist: (session) => {
            on = (session.state().devices.com?.state as { on?: boolean } | undefined)?.on;
          },
        });
        expect(result).toEqual({ ok: true });
        expect(on).toBe(true);
      });
    });

    it('has no FLARM check before take-off (intake §9 question 34)', () => {
      const items = normalProcedures.beforeTakeoff.items as readonly Item[];
      const controls = items.flatMap((item) => [
        ...('control' in item ? [item.control] : []),
        ...(item.type === 'check' && item.target && 'control' in item.target
          ? [item.target.control]
          : []),
      ]);
      expect(controls.length).toBeGreaterThan(0);
      expect(controls.filter((control) => control.startsWith('flarm.'))).toEqual([]);
    });

    describe('Transponder: STBY after landing (intake §3.8.2)', () => {
      const stby = 'Transponder: STBY';

      it('closes the after-landing checklist after two MODE presses from ACS', () => {
        const items = normalProcedures.afterLanding.items as readonly Item[];
        const at = items.findIndex((item) => said(item) === stby);
        expect(at).toBe(items.length - 1);
        expect(items[at]).toMatchObject({ type: 'check', target: { control: 'xpdr.mode' } });
        for (const press of [items[at - 2], items[at - 1]]) {
          expect(press).toMatchObject({
            type: 'action',
            control: 'xpdr.mode',
            position: 'pressed',
          });
        }
      });

      it('records an unmet check when ticked with the transponder still at ACS', () => {
        expect(tickedAt(only('afterLanding', [stby]), 'afterLanding', () => {})).toEqual([
          expect.objectContaining({ kind: 'unmet-check' }),
        ]);
      });
    });

    describe('GPS has a position fix (assumed, intake §9 questions 32 and 38)', () => {
      const fix = 'GPS: position fix (3D GPS Location)';
      const aircraft = only('beforeTakeoff', [fix]);

      it('is a check on the GPS, after accepting its databases and opening its map page', () => {
        const items = normalProcedures.beforeTakeoff.items as readonly Item[];
        const at = items.findIndex((item) => said(item) === fix);
        const accept = items.findIndex((item) => item.text.en === 'GPS: databases accepted');
        expect(items[at]).toMatchObject({ type: 'check', target: { control: 'gps.power' } });
        expect(items[accept]).toMatchObject({
          type: 'action',
          control: 'gps.touch',
          position: 'accept',
        });
        expect(items[accept + 1]).toMatchObject({
          type: 'action',
          control: 'gps.touch',
          position: 'map',
          text: { en: 'GPS: map page', de: 'GPS: Kartenseite' },
        });
        expect(accept).toBeLessThan(at);
      });

      describe('databases accepted early, while the aera still showed its start-up page', () => {
        const steps = only('beforeTakeoff', ['GPS: databases accepted', 'GPS: map page']);
        const atAccept = (prepare: (session: Session) => void) => {
          const session = createSession(steps, { devices, phase: 'holding' });
          session.advance(100);
          prepare(session);
          session.takeChecklist('beforeTakeoff');
          return session;
        };
        const accept = (session: Session) => {
          session.press('gps.touch', 'accept');
          session.release('gps.touch');
          session.advance(100);
        };

        it('takes a tick once the aera has left its start-up page, then opens the map', () => {
          const session = atAccept(accept);
          session.checkOff();
          expect(session.checklist()?.current).toBe(1);
          session.press('gps.touch', 'map');
          session.release('gps.touch');
          session.advance(100);
          expect(session.checklist()).toMatchObject({ done: true, deviations: [] });
        });

        it('records the step undone when ticked on the start-up page', () => {
          const session = atAccept(() => {});
          session.checkOff();
          expect(session.checklist()?.deviations).toEqual([
            expect.objectContaining({ kind: 'wrong-position', controlId: 'gps.touch' }),
          ]);
        });
      });

      it('records an unmet check when ticked with the GPS breaker pulled', () => {
        const pulled = (session: Session) => {
          session.set('gpsBreaker', 'pulled');
          session.advance(100);
        };
        expect(tickedAt(aircraft, 'beforeTakeoff', pulled)).toContainEqual(
          expect.objectContaining({ kind: 'unmet-check' }),
        );
      });

      it('records nothing when ticked with the GPS on its cradle power and its fix found', () => {
        expect(
          tickedAt(aircraft, 'beforeTakeoff', () => {}).filter(
            (deviation) => deviation.kind === 'unmet-check',
          ),
        ).toEqual([]);
      });
    });

    it('leaves the radio item a confirm, which the trainer does not model', () => {
      const confirms = Object.values(normalProcedures).flatMap((procedure) =>
        (procedure.items as readonly Item[]).filter((item) => item.type === 'confirm'),
      );
      expect(confirms.map((item) => item.text.en)).toEqual(expect.arrayContaining(['Radio set']));
    });

    it.each([
      ['beforeTakeoff', 'Altimeter set to QNH'],
      ['descent', 'Altimeter set'],
    ] as const)('sets the altimeter knob to QNH in %s (#719)', (id, wording) => {
      const items = normalProcedures[id].items as readonly Item[];
      expect(items.filter((item) => item.text.en === wording)).toEqual([
        expect.objectContaining({ type: 'action', control: 'altimeterSetting', position: '1013' }),
      ]);
    });
  });
});

describe('the altimeter knob in the normal procedures (#719)', () => {
  const alone = (id: 'beforeTakeoff' | 'descent', wording: string): Aircraft => {
    const procedure = ctslAircraft.procedures[id];
    if (!procedure) throw new Error(`no procedure ${id}`);
    return {
      ...ctslAircraft,
      procedures: {
        ...ctslAircraft.procedures,
        [id]: { ...procedure, items: procedure.items.filter((item) => item.text.en === wording) },
      },
    } as Aircraft;
  };
  const start = (id: 'beforeTakeoff' | 'descent', wording: string) => {
    const session = createSession(alone(id, wording), {
      devices,
      phase: ctslAircraft.procedures[id]?.startPhase ?? '',
    });
    session.startProcedure(id);
    session.advance(100);
    return session;
  };

  it('enters the holding point with the last flight setting, so N6 is a real turn', () => {
    const session = start('beforeTakeoff', 'Altimeter set to QNH');
    expect(session.state().controls.altimeterSetting).toBe('1025');
    for (let setting = 1024; setting >= 1013; setting -= 1) {
      session.set('altimeterSetting', String(setting));
      session.advance(50);
    }
    expect(session.checklist()?.done).toBe(true);
    expect(session.checklist()?.deviations).toEqual([]);
  });

  it('records a wrong setting ticked as set', () => {
    const session = start('beforeTakeoff', 'Altimeter set to QNH');
    session.set('altimeterSetting', '1020');
    session.advance(50);
    session.checkOff();
    expect(session.checklist()?.deviations).toContainEqual(
      expect.objectContaining({ kind: 'wrong-position', controlId: 'altimeterSetting' }),
    );
  });

  it('enters the descent with QNH set, so N11 is verified with a tick', () => {
    const session = start('descent', 'Altimeter set');
    expect(session.state().controls.altimeterSetting).toBe('1013');
    session.checkOff();
    expect(session.checklist()?.done).toBe(true);
    expect(session.checklist()?.deviations).toEqual([]);
  });
});

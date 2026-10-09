import { flightLegs, walkFlight, walkProcedure } from '@cpt/core';
import type { Session } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { aircraftRegistry } from './aircraft-registry';
import { deviceRegistry } from './device-registry';

const proceduresOf = (type: 'normal' | 'emergency') =>
  aircraftRegistry.flatMap((aircraft) =>
    Object.entries(aircraft.procedures)
      .filter(([, procedure]) => procedure.type === type)
      .map(([id]) => [aircraft.id, id, aircraft] as const),
  );
const normalProcedures = proceduresOf('normal');
const emergencyProcedures = proceduresOf('emergency');

describe('procedure walk-through', () => {
  it('covers at least one procedure of each type', () => {
    expect(normalProcedures.length).toBeGreaterThan(0);
    expect(emergencyProcedures.length).toBeGreaterThan(0);
  });

  it.each([
    ...normalProcedures.flatMap((walk) =>
      (['listed', 'reversed'] as const).map((order) => [...walk, order] as const),
    ),
    ...emergencyProcedures.map((walk) => [...walk, 'listed'] as const),
  ])('%s: %s completes with its flow %s', (_aircraft, id, aircraft, flowOrder) => {
    const result = walkProcedure(aircraft, id, { devices: deviceRegistry, flowOrder });
    if (!result.ok) {
      expect.fail(
        `aircraft "${result.aircraft}", procedure "${result.procedure}", item ${result.itemIndex} ` +
          `"${result.item}": ${result.reason}`,
      );
    }
    expect(result).toEqual({ ok: true });
  });
});

describe('full-flight walk-through', () => {
  const ctsl = aircraftRegistry.find((aircraft) => aircraft.id === 'ctsl');
  if (!ctsl) throw new Error('The registry has no CTSL');

  it('chains the CTSL normal procedures from cold and dark to securing', () => {
    expect(flightLegs(ctsl)).toEqual([
      'preflight',
      'engineStart',
      'taxi',
      'beforeTakeoff',
      'radioAndTransponder',
      'takeoff',
      'climbCruise',
      'descent',
      'beforeLanding',
      'landing',
      'afterLanding',
      'shutdown',
    ]);
  });

  it.each(aircraftRegistry.map((aircraft) => [aircraft.id, aircraft] as const))(
    '%s: completes every leg from the cockpit the leg before left',
    (_id, aircraft) => {
      const result = walkFlight(aircraft, { devices: deviceRegistry });
      if (!result.ok) {
        expect.fail(
          `aircraft "${result.aircraft}", leg "${result.procedure}", item ${result.itemIndex} ` +
            `"${result.item}": ${result.reason}`,
        );
      }
      expect(result).toEqual({ ok: true });
    },
  );
});

describe('the CTSL GPS and intercom in a full flight', () => {
  const ctsl = aircraftRegistry.find((aircraft) => aircraft.id === 'ctsl');
  if (!ctsl) throw new Error('The registry has no CTSL');
  const lineUp = ctsl.phases.linedUp?.entry;
  if (!lineUp) throw new Error('The CTSL has no line-up phase');

  it('switches both on before line-up and carries them on as the line-up phase starts them', () => {
    const carried: Record<string, { intercom: unknown; gps: unknown }> = {};
    const result = walkFlight(ctsl, {
      devices: deviceRegistry,
      afterChecklist: (session, id) => {
        const state = session.state();
        carried[id] = { intercom: state.controls.intercom, gps: state.devices.gps?.state };
      },
    });
    expect(result).toEqual({ ok: true });
    const legs = flightLegs(ctsl);
    const takeoff = legs.indexOf('takeoff');
    expect(takeoff).toBeGreaterThan(0);
    for (const id of legs.slice(takeoff - 1, legs.indexOf('shutdown'))) {
      expect(carried[id], id).toMatchObject({
        intercom: lineUp.controls.intercom,
        gps: lineUp.deviceStates?.gps,
      });
    }
  });
});

describe('the CTSL rescue safety pin', () => {
  const ctsl = aircraftRegistry.find((aircraft) => aircraft.id === 'ctsl');
  if (!ctsl) throw new Error('The registry has no CTSL');
  const pinAfter = (walk: (afterChecklist: (session: Session, id: string) => void) => unknown) => {
    const pin: Record<string, string | undefined> = {};
    walk((session, id) => {
      pin[id] = session.guards().rescueHandle;
    });
    return pin;
  };

  it('stays as the pilot left it through a full flight: out from before take-off to shutdown', () => {
    const pin = pinAfter((afterChecklist) =>
      walkFlight(ctsl, { devices: deviceRegistry, afterChecklist }),
    );
    const legs = flightLegs(ctsl);
    const removed = legs.indexOf('beforeTakeoff');
    expect(pin).toEqual(
      Object.fromEntries(
        legs.map((id, at) => [id, at >= removed && id !== 'shutdown' ? 'open' : 'closed']),
      ),
    );
  });

  it.each([
    ['beforeTakeoff', 'open'],
    ['shutdown', 'closed'],
  ])('%s flown alone leaves the pin guard %s', (id, guard) => {
    const pin = pinAfter((afterChecklist) =>
      walkProcedure(ctsl, id, { devices: deviceRegistry, afterChecklist }),
    );
    expect(pin).toEqual({ [id]: guard });
  });
});

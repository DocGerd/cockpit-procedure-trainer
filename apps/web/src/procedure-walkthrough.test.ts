import { flightLegs, walkFlight, walkProcedure } from '@cpt/core';
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

  // The demo is left out: its shutdown opens with a throttle check the pilot meets by closing the
  // throttle after taxiing in, a move between legs that the walker does not make.
  it('completes every CTSL leg from the cockpit the leg before left', () => {
    const result = walkFlight(ctsl, { devices: deviceRegistry });
    if (!result.ok) {
      expect.fail(
        `leg "${result.procedure}", item ${result.itemIndex} "${result.item}": ${result.reason}`,
      );
    }
    expect(result).toEqual({ ok: true });
  });
});

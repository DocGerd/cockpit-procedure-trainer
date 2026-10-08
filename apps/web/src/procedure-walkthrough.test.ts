import { walkProcedure } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { aircraftRegistry } from './aircraft-registry';
import { deviceRegistry } from './device-registry';

const normalProcedures = aircraftRegistry.flatMap((aircraft) =>
  Object.entries(aircraft.procedures)
    .filter(([, procedure]) => procedure.type === 'normal')
    .map(([id]) => [aircraft.id, id, aircraft] as const),
);

describe('procedure walk-through', () => {
  it('covers at least one normal procedure', () => {
    expect(normalProcedures.length).toBeGreaterThan(0);
  });

  it.each(
    normalProcedures.flatMap((walk) =>
      (['listed', 'reversed'] as const).map((order) => [...walk, order] as const),
    ),
  )('%s: %s completes with its flow %s', (_aircraft, id, aircraft, flowOrder) => {
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

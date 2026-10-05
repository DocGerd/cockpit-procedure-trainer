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

  it.each(normalProcedures)('%s: %s completes with no deviations', (_aircraft, id, aircraft) => {
    const result = walkProcedure(aircraft, id, { devices: deviceRegistry });
    if (!result.ok) {
      expect.fail(
        `aircraft "${result.aircraft}", procedure "${result.procedure}", item ${result.itemIndex} ` +
          `"${result.item}": ${result.reason}`,
      );
    }
    expect(result).toEqual({ ok: true });
  });
});

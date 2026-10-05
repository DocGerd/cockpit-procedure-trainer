import { formatFinding, validateAircraft } from '@cpt/core';
import { expect, it } from 'vitest';
import { aircraftRegistry } from './aircraft-registry';
import { deviceRegistry } from './device-registry';

it('has no validation findings in any registered aircraft', () => {
  const findings = aircraftRegistry.flatMap((aircraft) =>
    validateAircraft(aircraft, { devices: deviceRegistry }),
  );
  expect(findings.map(formatFinding)).toEqual([]);
});

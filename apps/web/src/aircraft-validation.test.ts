import { formatFinding, validateAircraft } from '@cpt/core';
import { expect, it } from 'vitest';
import { aircraftRegistry } from './aircraft-registry';

it('has no validation findings in any registered aircraft', () => {
  const findings = aircraftRegistry.flatMap((aircraft) => validateAircraft(aircraft));
  expect(findings.map(formatFinding)).toEqual([]);
});

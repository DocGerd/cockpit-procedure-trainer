import { createSession } from '@cpt/core';
import { expect, it } from 'vitest';
import { aircraftRegistry } from './aircraft-registry';
import { deviceRegistry } from './device-registry';

it.each(aircraftRegistry.map((aircraft) => [aircraft.id, aircraft] as const))(
  'starts a session for %s and enters every phase',
  (_id, aircraft) => {
    const session = createSession(aircraft, { devices: deviceRegistry });
    for (const phase of Object.keys(aircraft.phases)) {
      session.jumpToPhase(phase);
      expect(session.phase()).toBe(phase);
      expect(session.status()).toEqual({ kind: 'running' });
    }
  },
);

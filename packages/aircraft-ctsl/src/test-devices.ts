import type { Device } from '@cpt/core';

// An aircraft depends on core only, so its tests install stand-ins that share the control ids of
// the real devices. Each device task adds its stand-in here.
export const testDevices: readonly Device[] = [];

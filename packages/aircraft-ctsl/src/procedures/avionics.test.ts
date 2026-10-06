import { formatFinding, validateAircraft } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { ctslAircraft } from '../index';
import { testDevices } from '../test-devices';
import { avionicsProcedures } from './avionics';

const procedure = avionicsProcedures.radioAndTransponder;

describe('radioAndTransponder', () => {
  it('is a normal procedure from the holding point', () => {
    expect(procedure).toMatchObject({ type: 'normal', startPhase: 'holding' });
    expect(ctslAircraft.procedures.radioAndTransponder).toBe(procedure);
  });

  it('validates with the stand-in devices', () => {
    const findings = validateAircraft(ctslAircraft, { devices: testDevices });
    expect(findings.map(formatFinding)).toEqual([]);
  });

  it('sets the radio first, then the transponder to standby, the VFR code and altitude', () => {
    const controls = procedure.items.flatMap((item) =>
      item.type === 'action' ? [`${item.control}=${item.position}`] : [],
    );
    expect(controls).toEqual([
      'com.coarse=up',
      'com.swap=pressed',
      'xpdr.mode=sby',
      'xpdr.vfr=pressed',
      'xpdr.mode=alt',
    ]);
  });

  it('has a check on the device state after the radio, the code and the mode', () => {
    expect(procedure.items.map((item) => item.type)).toEqual([
      'action',
      'action',
      'check',
      'action',
      'action',
      'check',
      'action',
      'check',
    ]);
  });
});

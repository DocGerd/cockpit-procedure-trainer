import { formatFinding, validateAircraft, walkProcedure } from '@cpt/core';
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

  it('sets the radio (already on since N3), then switches the transponder on in standby, the VFR code and ACS', () => {
    const controls = procedure.items.flatMap((item) =>
      item.type === 'action' ? [`${item.control}=${item.position}`] : [],
    );
    expect(controls).toEqual([
      'com.freq=up',
      'com.swap=pressed',
      'xpdr.power=pressed',
      'xpdr.vfr=pressed',
      'xpdr.mode=pressed',
    ]);
  });

  it('walks to its end with the stand-in devices', () => {
    expect(walkProcedure(ctslAircraft, 'radioAndTransponder', { devices: testDevices })).toEqual({
      ok: true,
    });
  });

  it('names the keys the pilot presses', () => {
    const texts = procedure.items.map((item) => item.text.en);
    expect(texts).not.toContain('COM radio on (I/O)');
    const pressed = procedure.items.flatMap((item) => ('control' in item ? [item.control] : []));
    expect(pressed as string[]).not.toContain('com.power');
    expect(texts).toContain('Transponder on (I/O), standby');
    expect(texts).toContain('Transponder to ACS (MODE)');
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

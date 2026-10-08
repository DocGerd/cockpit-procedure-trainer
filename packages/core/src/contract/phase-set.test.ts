import { describe, expect, it } from 'vitest';
import { everyPhase, isPhaseId, phaseName, phaseOrder, sharedPhases } from './index';

describe('the shared phase set', () => {
  it('lists the phases of a whole flight in flight order', () => {
    expect(phaseOrder).toEqual([
      'parking',
      'taxiOut',
      'holding',
      'linedUp',
      'departure',
      'cruise',
      'approach',
      'landing',
      'taxiIn',
      'parkingSecuring',
    ]);
    expect(sharedPhases.map(({ id }) => id)).toEqual(phaseOrder);
  });

  it('names every phase in German and English', () => {
    for (const { name } of sharedPhases) {
      expect(name.de.trim()).not.toBe('');
      expect(name.en.trim()).not.toBe('');
    }
    expect(phaseName('taxiOut')).toEqual({ de: 'Rollen zum Rollhalt', en: 'Taxi out' });
    expect(phaseName('runup')).toBeUndefined();
  });

  it('tells a shared phase id from any other string', () => {
    expect(isPhaseId('holding')).toBe(true);
    expect(isPhaseId('runup')).toBe(false);
  });

  it('fills every phase with one definition', () => {
    const phases = everyPhase('same');
    expect(Object.keys(phases)).toEqual(phaseOrder);
    expect(new Set(Object.values(phases))).toEqual(new Set(['same']));
  });
});

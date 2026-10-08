import { describe, expect, it } from 'vitest';
import type { Aircraft, ProcedureDefinition } from '../contract';
import { fixtureAircraft } from '../contract/fixtures';
import { flightLegs } from './index';

const confirm = [{ type: 'confirm', text: { de: 'Bereit', en: 'Ready' } }] as const;

const normal = (startPhase: string, endPhase?: string): ProcedureDefinition<unknown> =>
  ({
    title: { de: startPhase, en: startPhase },
    type: 'normal',
    startPhase,
    ...(endPhase === undefined ? {} : { endPhase }),
    items: confirm,
  }) as ProcedureDefinition<unknown>;

const phase = fixtureAircraft.phases['parking'];
const withPhases = (ids: readonly string[], procedures: Record<string, unknown>): Aircraft =>
  ({
    ...fixtureAircraft,
    phases: Object.fromEntries(ids.map((id) => [id, phase])),
    procedures,
  }) as Aircraft;

const flight = ['parking', 'holding', 'linedUp', 'departure', 'cruise', 'landing', 'taxiIn'];

describe('flightLegs', () => {
  it('takes the normal procedures in phase order, declaration order within a phase', () => {
    const aircraft = withPhases(flight, {
      shutdown: normal('taxiIn'),
      engineStart: normal('parking'),
      beforeTakeoff: normal('holding'),
      preflight: normal('parking'),
      avionics: normal('holding'),
    });
    expect(flightLegs(aircraft)).toEqual([
      'engineStart',
      'preflight',
      'beforeTakeoff',
      'avionics',
      'shutdown',
    ]);
  });

  it('leaves out emergency procedures, alternatives the flight has passed and backward branches', () => {
    const aircraft = withPhases(flight, {
      takeoff: normal('linedUp', 'departure'),
      shortTakeoff: normal('linedUp', 'departure'),
      climb: normal('departure', 'cruise'),
      fire: { ...normal('cruise'), type: 'emergency', failure: 'alternatorFailure' },
      landing: normal('cruise', 'landing'),
      goAround: normal('landing', 'departure'),
      afterLanding: normal('taxiIn'),
    });
    expect(flightLegs(aircraft)).toEqual(['takeoff', 'climb', 'landing', 'afterLanding']);
  });

  it('follows the phase order it is given', () => {
    const aircraft = withPhases(flight, { a: normal('cruise'), b: normal('parking') });
    expect(flightLegs(aircraft, ['cruise', 'parking'])).toEqual(['a', 'b']);
    expect(flightLegs(aircraft)).toEqual(['b', 'a']);
  });

  it('is empty for an aircraft without normal procedures', () => {
    expect(flightLegs(withPhases(flight, {}))).toEqual([]);
  });

  it('chains the fixture before-start procedure', () => {
    expect(flightLegs(fixtureAircraft)).toEqual(['beforeStart']);
  });
});

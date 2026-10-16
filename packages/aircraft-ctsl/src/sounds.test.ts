import { createSession, STEP_MS } from '@cpt/core';
import type { PhaseId, Session, SoundDefinition } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { ctslAircraft } from './index';
import { sounds } from './sounds';
import { IDLE_RPM, MAX_CONTINUOUS_RPM, power } from './systems';
import type { CtslState, CtslTrainerState } from './systems';
import { testDevices as devices } from './test-devices';

const sessionAt = (phase: PhaseId) => createSession(ctslAircraft, { devices, phase });

const advanceSeconds = (session: Session, seconds: number) => {
  for (let elapsed = 0; elapsed < seconds * 1000; elapsed += STEP_MS) session.advance(STEP_MS);
};

const input = (session: Session, sound: string, name: string) => {
  const definition: SoundDefinition<CtslState> | undefined = sounds[sound];
  const select = definition?.inputs?.[name];
  if (select === undefined) throw new Error(`no input ${sound}.${name}`);
  return select(session.state() as CtslTrainerState);
};

const engine = (session: Session) => ({
  rpm: input(session, 'engine', 'rpm'),
  running: input(session, 'engine', 'running'),
  starter: input(session, 'engine', 'starter'),
});

const PAST_STARTER_LIMIT_S = 10.5;

const cranking = (session: Session) => (session.state().systems as CtslState).starter.cranking;

const readyToStart = (session: Session) => {
  session.set('battery', 'in');
  session.set('fuelValve', 'open');
  session.set('ignition', 'off');
  session.set('ignition', 'both');
};

describe('declarations', () => {
  it('declares the engine, the airflow and the flap motor', () => {
    expect(Object.keys(sounds)).toEqual(['engine', 'airflow', 'flaps']);
    expect(sounds['engine']?.voice).toBe('piston-engine');
    expect(sounds['airflow']?.voice).toBe('airflow');
    expect(sounds['flaps']?.voice).toBe('electric-motor');
  });

  it('is the declaration the CTSL definition carries', () => {
    expect(ctslAircraft.sounds).toBe(sounds);
  });

  it('carries the set point inputs and nothing else', () => {
    expect(sounds['engine']?.carried).toEqual(['rpm']);
    expect(sounds['airflow']?.carried).toEqual(['airspeedKmh']);
    expect(sounds['flaps']?.carried).toBeUndefined();
  });

  it('names the inputs each voice reads', () => {
    expect(Object.keys(sounds['engine']?.inputs ?? {})).toEqual(['rpm', 'running', 'starter']);
    expect(Object.keys(sounds['airflow']?.inputs ?? {})).toEqual(['airspeedKmh']);
    expect(Object.keys(sounds['flaps']?.inputs ?? {})).toEqual(['driving']);
  });

  it('feeds the engine voice the systems rpm range and the airflow voice a red line', () => {
    const options = sounds['engine']?.options;
    expect(options).toMatchObject({
      cylinders: 4,
      idleRpm: IDLE_RPM,
      maxContinuousRpm: MAX_CONTINUOUS_RPM,
    });
    expect(options).not.toHaveProperty('crankingRpm');
    expect(power(IDLE_RPM)).toBe(0);
    expect(power(MAX_CONTINUOUS_RPM)).toBe(1);
    expect(sounds['airflow']?.options).toEqual({ referenceKmh: 300 });
    expect(sounds['flaps']?.options).toBeUndefined();
  });
});

describe('engine sound facts', () => {
  it('passes the gearbox ratio and, with the blade count open, no blade count', () => {
    const options = sounds['engine']?.options;
    expect(options).toMatchObject({ gearboxRatio: 2.273 });
    expect(options).not.toHaveProperty('bladeCount');
  });
});

describe('engine inputs over a real start', () => {
  it('cranks, catches, idles, runs full, drops on a magneto, and stops', () => {
    const session = sessionAt('parking');
    expect(engine(session)).toEqual({ rpm: 0, running: 0, starter: 0 });
    readyToStart(session);
    session.set('choke', 'on');
    session.press('ignition', 'start');
    advanceSeconds(session, 0.5);
    expect(engine(session)).toEqual({ rpm: 0, running: 0, starter: 1 });
    advanceSeconds(session, 2);
    expect(engine(session)).toEqual({ rpm: IDLE_RPM, running: 1, starter: 1 });
    session.release('ignition');
    advanceSeconds(session, 0.1);
    expect(engine(session)).toEqual({ rpm: IDLE_RPM, running: 1, starter: 0 });

    session.set('throttle', 'full');
    advanceSeconds(session, 0.1);
    const full = engine(session).rpm;
    expect(full).toBeGreaterThan(IDLE_RPM);
    expect(full).toBeLessThanOrEqual(MAX_CONTINUOUS_RPM);

    session.set('ignition', 'left');
    advanceSeconds(session, 0.1);
    expect(engine(session).rpm).toBeLessThan(full);
    expect(engine(session).running).toBe(1);
    session.set('ignition', 'both');
    advanceSeconds(session, 0.1);
    expect(engine(session).rpm).toBe(full);

    session.set('throttle', 'idle');
    session.set('ignition', 'off');
    advanceSeconds(session, 0.1);
    expect(engine(session)).toEqual({ rpm: 0, running: 0, starter: 0 });
  });

  it('turns the starter with no catch when the cold engine has no choke', () => {
    const session = sessionAt('parking');
    readyToStart(session);
    session.press('ignition', 'start');
    advanceSeconds(session, 5);
    expect(engine(session)).toEqual({ rpm: 0, running: 0, starter: 1 });
  });

  it('drops the starter when the key is released before the catch', () => {
    const session = sessionAt('parking');
    readyToStart(session);
    session.set('choke', 'on');
    session.press('ignition', 'start');
    advanceSeconds(session, 0.5);
    session.release('ignition');
    advanceSeconds(session, 0.1);
    expect(engine(session)).toEqual({ rpm: 0, running: 0, starter: 0 });
    advanceSeconds(session, 5);
    expect(engine(session).running).toBe(0);
  });

  it('keeps the starter on with no catch once the key is held past the lockout', () => {
    const session = sessionAt('parking');
    readyToStart(session);
    session.press('ignition', 'start');
    advanceSeconds(session, PAST_STARTER_LIMIT_S);
    expect(cranking(session)).toBe(false);
    session.set('choke', 'on');
    advanceSeconds(session, 5);
    expect(cranking(session)).toBe(false);
    expect(engine(session)).toEqual({ rpm: 0, running: 0, starter: 1 });
  });

  it('turns the starter with no catch during the cool-down', () => {
    const session = sessionAt('parking');
    readyToStart(session);
    session.press('ignition', 'start');
    advanceSeconds(session, PAST_STARTER_LIMIT_S);
    session.release('ignition');
    session.set('choke', 'on');
    advanceSeconds(session, 1);
    session.press('ignition', 'start');
    advanceSeconds(session, 5);
    expect(cranking(session)).toBe(false);
    expect(engine(session)).toEqual({ rpm: 0, running: 0, starter: 1 });
  });

  it('keeps the starter off with BAT pulled', () => {
    const session = sessionAt('parking');
    readyToStart(session);
    session.set('battery', 'pulled');
    expect(session.press('ignition', 'start').applied).toBe(true);
    advanceSeconds(session, 1);
    expect(engine(session).starter).toBe(0);
  });

  it('shows a windmilling engine as turning but not running, then started', () => {
    const session = sessionAt('cruise');
    expect(engine(session).running).toBe(1);
    session.set('ignition', 'off');
    advanceSeconds(session, 1);
    const windmill = engine(session);
    expect(windmill.running).toBe(0);
    expect(windmill.starter).toBe(0);
    expect(windmill.rpm).toBeGreaterThan(0);
    session.set('ignition', 'start');
    advanceSeconds(session, 3);
    expect(engine(session).running).toBe(1);
  });
});

describe('airflow input', () => {
  it('follows the airspeed', () => {
    expect(input(sessionAt('parking'), 'airflow', 'airspeedKmh')).toBe(0);
    const cruise = sessionAt('cruise');
    expect(input(cruise, 'airflow', 'airspeedKmh')).toBe(
      (cruise.state().systems as CtslState).airspeedKmh,
    );
    expect(input(cruise, 'airflow', 'airspeedKmh')).toBeGreaterThan(0);
  });
});

describe('flap motor input', () => {
  const driving = (session: Session) => input(session, 'flaps', 'driving');

  it('runs while the flaps travel and stops at rest', () => {
    const session = sessionAt('parking');
    expect(driving(session)).toBe(0);
    session.set('battery', 'in');
    session.set('flapSelector', '15');
    advanceSeconds(session, 1);
    expect(driving(session)).toBe(1);
    advanceSeconds(session, 20);
    expect(driving(session)).toBe(0);
  });

  it('is off without power', () => {
    const session = sessionAt('parking');
    expect(session.set('flapSelector', '15').applied).toBe(true);
    advanceSeconds(session, 1);
    expect(driving(session)).toBe(0);
  });

  it('is off while the overload cut-out holds extension back', () => {
    const session = sessionAt('cruise');
    session.set('flapSelector', '0');
    advanceSeconds(session, 5);
    const { flaps } = session.state().systems as CtslState;
    expect(flaps.moving).toBe(true);
    expect(driving(session)).toBe(0);
  });
});

import { createSession, createSystemsRuntime, STEP_MS } from '@cpt/core';
import type { ControlPosition, Environment, Session } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import type { CtslFailure } from './failures';
import { ctslAircraft } from './index';
import { chargeLampLit, indicators } from './indicators';
import { phases } from './phases';
import type { PhaseId } from './phases';
import { initial, runningFrom, step } from './systems';
import type { CtslState, CtslTrainerState } from './systems';
import { testDevices as devices } from './test-devices';

const MAX_SINGLE_CIRCUIT_DROP_RPM = 300;
const MAX_CIRCUIT_DROP_DIFFERENCE_RPM = 120;
const MIN_TAKEOFF_OIL_C = 51;
const CHT_RED_LINE_C = 120;
const OIL_TEMP_RED_LINE_C = 130;
const STARTER_LIMIT_S = 10;
const STARTER_COOLING_S = 120;
const KMH_PER_KT = 1.852;
const END_SWITCH_OVERTRAVEL_MAX_DEG = 5;

const sessionAt = (phase: PhaseId) => createSession(ctslAircraft, { devices, phase });

const systems = (session: Session) => session.state().systems as CtslState;

const advanceSeconds = (session: Session, seconds: number) => {
  for (let elapsed = 0; elapsed < seconds * 1000; elapsed += STEP_MS) session.advance(STEP_MS);
};

const secondsUntil = (session: Session, done: (state: CtslState) => boolean, limitS: number) => {
  for (let elapsed = 0; elapsed <= limitS * 1000; elapsed += STEP_MS) {
    if (done(systems(session))) return elapsed / 1000;
    session.advance(STEP_MS);
  }
  return Infinity;
};

const readyToStart = (session: Session) => {
  session.set('battery', 'in');
  session.set('fuelValve', 'open');
  session.set('ignition', 'both');
};

const crank = (session: Session, seconds: number) => {
  session.press('ignition', 'start');
  advanceSeconds(session, seconds);
  session.release('ignition');
};

const coldStart = () => {
  const session = sessionAt('parking');
  readyToStart(session);
  session.set('choke', 'on');
  crank(session, 3);
  return session;
};

type Rig = {
  state(): CtslState;
  set(id: string, position: ControlPosition): void;
  advance(seconds: number): void;
  secondsUntil(done: (state: CtslState) => boolean, limitS: number): number;
};

const rig = (
  phase: PhaseId,
  failures: readonly CtslFailure[] = [],
  environment: Environment = phases[phase].environment,
): Rig => {
  const controls: Record<string, ControlPosition> = { ...phases[phase].entry.controls };
  const runtime = createSystemsRuntime<CtslState, CtslFailure>(
    { initial, step },
    { environment, controls },
  );
  runtime.reset(runningFromOrInitial(phase, environment));
  runtime.setFailures(new Set(failures));
  runtime.onControlsChanged({ ...controls });
  const advance = (seconds: number) => {
    for (let elapsed = 0; elapsed < seconds * 1000; elapsed += STEP_MS) runtime.advance(STEP_MS);
  };
  return {
    state: () => runtime.state(),
    set(id, position) {
      controls[id] = position;
      runtime.onControlsChanged({ ...controls });
    },
    advance,
    secondsUntil(done, limitS) {
      for (let elapsed = 0; elapsed <= limitS * 1000; elapsed += STEP_MS) {
        if (done(runtime.state())) return elapsed / 1000;
        runtime.advance(STEP_MS);
      }
      return Infinity;
    },
  };
};

const runningFromOrInitial = (phase: PhaseId, environment: Environment) =>
  phase === 'parking' ? initial : runningFrom(phases[phase].entry.controls, environment);

const trainerState = (session: Session) => session.state() as CtslTrainerState;

describe('engine start', () => {
  it('starts cold with the choke on and the throttle at idle', () => {
    const session = coldStart();
    expect(systems(session).engine.running).toBe(true);
  });

  it('does not crank with BAT pulled', () => {
    const session = sessionAt('parking');
    readyToStart(session);
    session.set('battery', 'pulled');
    session.set('choke', 'on');
    session.press('ignition', 'start');
    advanceSeconds(session, 3);
    expect(systems(session).starter.cranking).toBe(false);
    expect(systems(session).engine.running).toBe(false);
  });

  it('does not start with the fuel valve closed: the key has no effect', () => {
    const session = sessionAt('parking');
    readyToStart(session);
    session.set('fuelValve', 'closed');
    session.set('choke', 'on');
    session.press('ignition', 'start');
    advanceSeconds(session, 3);
    expect(systems(session).starter.cranking).toBe(false);
    expect(systems(session).engine.running).toBe(false);
  });

  it('holds the key at OFF while the closed fuel valve covers the slot', () => {
    const session = sessionAt('parking');
    session.set('battery', 'in');
    for (const position of ['left', 'right', 'both']) {
      expect(session.set('ignition', position)).toEqual({ applied: false, reason: 'locked' });
    }
    expect(session.press('ignition', 'start')).toEqual({ applied: false, reason: 'locked' });
    advanceSeconds(session, 1);
    expect(session.state().controls.ignition).toBe('off');
    expect(systems(session).starter.cranking).toBe(false);
  });

  it('frees the key once the fuel valve opens', () => {
    const session = sessionAt('parking');
    session.set('fuelValve', 'open');
    expect(session.set('ignition', 'both')).toEqual({ applied: true });
  });

  it('closes the fuel valve with the key still on, and the key then turns only to OFF', () => {
    const session = sessionAt('holding');
    expect(session.set('fuelValve', 'closed')).toEqual({ applied: true });
    expect(session.set('ignition', 'left')).toEqual({ applied: true });
    expect(session.set('ignition', 'off')).toEqual({ applied: true });
    expect(session.set('ignition', 'both')).toEqual({ applied: false, reason: 'locked' });
  });

  it('does not start cold without the choke', () => {
    const session = sessionAt('parking');
    readyToStart(session);
    crank(session, 5);
    expect(systems(session).engine.running).toBe(false);
  });

  it('does not start cold with the choke on and the throttle open', () => {
    const session = sessionAt('parking');
    readyToStart(session);
    session.set('choke', 'on');
    session.set('throttle', 'low');
    crank(session, 5);
    expect(systems(session).engine.running).toBe(false);
  });

  it('starts warm without the choke', () => {
    const session = sessionAt('holding');
    session.set('ignition', 'off');
    advanceSeconds(session, 1);
    expect(systems(session).engine.running).toBe(false);
    crank(session, 3);
    expect(systems(session).engine.running).toBe(true);
  });

  it('stops cranking after the starter limit and cranks again only after cooling', () => {
    const session = sessionAt('parking');
    readyToStart(session);
    session.press('ignition', 'start');
    advanceSeconds(session, STARTER_LIMIT_S - 1);
    expect(systems(session).starter.cranking).toBe(true);
    advanceSeconds(session, 2);
    expect(systems(session).starter.cranking).toBe(false);
    session.release('ignition');

    session.set('choke', 'on');
    advanceSeconds(session, STARTER_COOLING_S - 3);
    session.press('ignition', 'start');
    advanceSeconds(session, 1);
    expect(systems(session).starter.cranking).toBe(false);
    session.release('ignition');
    expect(systems(session).engine.running).toBe(false);

    advanceSeconds(session, 2);
    crank(session, 3);
    expect(systems(session).engine.running).toBe(true);
  });

  it('counts cranking across back-to-back attempts against the starter limit', () => {
    const session = sessionAt('parking');
    readyToStart(session);
    crank(session, STARTER_LIMIT_S / 2 + 1);
    session.advance(STEP_MS);
    session.press('ignition', 'start');
    advanceSeconds(session, STARTER_LIMIT_S / 2);
    expect(systems(session).starter.cranking).toBe(false);
  });

  it('restarts a hot engine without the choke after a short stop', () => {
    const session = sessionAt('holding');
    session.set('throttle', 'cruise');
    advanceSeconds(session, 60);
    session.set('throttle', 'idle');
    session.set('ignition', 'off');
    advanceSeconds(session, 60);
    expect(systems(session).engine.running).toBe(false);
    crank(session, 3);
    expect(systems(session).engine.running).toBe(true);
  });

  it('raises oil pressure into the normal range within 10 s of a cold start', () => {
    const session = coldStart();
    const seconds = secondsUntil(
      session,
      (state) => state.oilPressureBar >= 2 && state.oilPressureBar <= 5,
      10,
    );
    expect(seconds).toBeLessThanOrEqual(10);
  });

  it('warms oil and CHT while running', () => {
    const session = coldStart();
    const cold = systems(session);
    advanceSeconds(session, 30);
    expect(systems(session).oilTempC).toBeGreaterThan(cold.oilTempC);
    expect(systems(session).chtC).toBeGreaterThan(cold.chtC);
  });

  it('runs oil and CHT hotter with more power', () => {
    const session = sessionAt('holding');
    const idle = systems(session);
    session.set('throttle', 'cruise');
    advanceSeconds(session, 60);
    expect(systems(session).oilTempC).toBeGreaterThan(idle.oilTempC + 10);
    expect(systems(session).chtC).toBeGreaterThan(idle.chtC + 10);
  });

  it('runs at idle rpm after start', () => {
    const session = coldStart();
    expect(systems(session).rpm).toBe(1400);
  });
});

describe('engine running', () => {
  it('keeps running with BAT and GEN pulled', () => {
    const session = sessionAt('holding');
    session.set('generator', 'pulled');
    session.set('battery', 'pulled');
    advanceSeconds(session, 30);
    expect(systems(session).bus.mainPowered).toBe(false);
    expect(systems(session).engine.running).toBe(true);
    expect(systems(session).rpm).toBeGreaterThan(0);
  });

  it('stops when the ignition is off', () => {
    const session = sessionAt('holding');
    session.set('ignition', 'off');
    advanceSeconds(session, 1);
    expect(systems(session).engine.running).toBe(false);
    expect(systems(session).rpm).toBe(0);
  });

  it('runs on after the fuel valve closes, then stops', () => {
    const session = sessionAt('holding');
    session.set('fuelValve', 'closed');
    advanceSeconds(session, 1);
    expect(systems(session).engine.running).toBe(true);
    advanceSeconds(session, 60);
    expect(systems(session).engine.running).toBe(false);
  });

  it('stops sooner on a closed fuel valve with the throttle full', () => {
    const idle = sessionAt('holding');
    idle.set('fuelValve', 'closed');
    const full = sessionAt('holding');
    full.set('throttle', 'full');
    full.set('fuelValve', 'closed');
    const stopped = (state: CtslState) => !state.engine.running;
    expect(secondsUntil(full, stopped, 60)).toBeLessThan(secondsUntil(idle, stopped, 60));
  });

  it.each([
    ['idle', 1400],
    ['runup', 4000],
    ['full', 5000],
  ])('turns %s on the ground at %i rpm', (throttle, rpm) => {
    const session = sessionAt('holding');
    session.set('throttle', throttle);
    expect(systems(session).rpm).toBe(rpm);
  });

  it('turns about 2000 to 2500 rpm at low power', () => {
    const session = sessionAt('holding');
    session.set('throttle', 'low');
    expect(systems(session).rpm).toBeGreaterThanOrEqual(2000);
    expect(systems(session).rpm).toBeLessThanOrEqual(2500);
  });

  it('never exceeds max continuous rpm in flight at full throttle', () => {
    const fast = rig('cruise', [], { airspeedKt: 140, altitudeFt: 2500, onGround: false });
    fast.set('throttle', 'full');
    expect(fast.state().rpm).toBeLessThanOrEqual(5500);
    expect(fast.state().rpm).toBeGreaterThan(5000);
  });

  it('drops rpm on each single ignition circuit within the run-up limits', () => {
    const session = sessionAt('holding');
    session.set('throttle', 'runup');
    const both = systems(session).rpm;
    session.set('ignition', 'left');
    const leftDrop = both - systems(session).rpm;
    session.set('ignition', 'right');
    const rightDrop = both - systems(session).rpm;
    expect(both).toBe(4000);
    for (const drop of [leftDrop, rightDrop]) {
      expect(drop).toBeGreaterThan(0);
      expect(drop).toBeLessThanOrEqual(MAX_SINGLE_CIRCUIT_DROP_RPM);
    }
    expect(Math.abs(leftDrop - rightDrop)).toBeLessThanOrEqual(MAX_CIRCUIT_DROP_DIFFERENCE_RPM);
  });

  it('relights a windmilling engine in flight without the starter', () => {
    const cruise = rig('cruise');
    cruise.set('ignition', 'off');
    cruise.advance(1);
    expect(cruise.state().engine.running).toBe(false);
    expect(cruise.state().rpm).toBeGreaterThanOrEqual(200);
    cruise.set('ignition', 'both');
    cruise.advance(3);
    expect(cruise.state().engine.running).toBe(true);
  });

  it('does not relight below the windmill threshold; the starter does', () => {
    const slow = rig('approach', [], { airspeedKt: 40, altitudeFt: 500, onGround: false });
    slow.set('ignition', 'off');
    slow.advance(1);
    expect(slow.state().rpm).toBeLessThan(200);
    slow.set('ignition', 'both');
    slow.advance(3);
    expect(slow.state().engine.running).toBe(false);
    slow.set('ignition', 'start');
    slow.advance(3);
    expect(slow.state().engine.running).toBe(true);
  });
});

describe('electrical system', () => {
  it('lights the charge lamp with BAT in and the engine stopped', () => {
    const session = sessionAt('parking');
    session.set('battery', 'in');
    session.set('generator', 'in');
    expect(chargeLampLit(trainerState(session))).toBe(true);
  });

  it('puts the charge lamp out once the engine runs with GEN in', () => {
    const session = coldStart();
    expect(chargeLampLit(trainerState(session))).toBe(true);
    session.set('generator', 'in');
    expect(systems(session).bus.charging).toBe(true);
    expect(chargeLampLit(trainerState(session))).toBe(false);
  });

  it('powers the main bus from BAT only', () => {
    const session = sessionAt('parking');
    session.set('generator', 'in');
    expect(systems(session).bus.mainPowered).toBe(false);
    session.set('battery', 'in');
    expect(systems(session).bus.mainPowered).toBe(true);
  });

  it('switches the avionics bus with the Avionics Master', () => {
    const session = sessionAt('holding');
    expect(systems(session).bus.avionicsPowered).toBe(true);
    session.set('avionicsMaster', 'off');
    expect(systems(session).bus.avionicsPowered).toBe(false);
  });

  it('powers no avionics without the main bus', () => {
    const session = sessionAt('parking');
    session.set('avionicsMaster', 'on');
    expect(systems(session).bus.avionicsPowered).toBe(false);
  });

  it.each([
    ['beacon', 'beacon', 'strobeBreaker'],
    ['positionLights', 'positionLights', 'positionBreaker'],
    ['landingLight', 'landingLight', 'landingBreaker'],
    ['intercom', 'intercom', 'intercomBreaker'],
  ] as const)(
    'runs %s from its rocker and breaker on the main bus',
    (consumer, rocker, breaker) => {
      const session = sessionAt('parking');
      session.set(rocker, 'on');
      expect(systems(session).consumers[consumer]).toBe(false);
      session.set('battery', 'in');
      expect(systems(session).consumers[consumer]).toBe(true);
      session.set(breaker, 'pulled');
      expect(systems(session).consumers[consumer]).toBe(false);
    },
  );

  it('runs the cockpit light from its rocker and the outlet from its breaker', () => {
    const session = sessionAt('parking');
    session.set('battery', 'in');
    expect(systems(session).consumers.cockpitLight).toBe(false);
    expect(systems(session).consumers.outlet).toBe(true);
    session.set('cockpitLight', 'on');
    session.set('outletBreaker', 'pulled');
    expect(systems(session).consumers.cockpitLight).toBe(true);
    expect(systems(session).consumers.outlet).toBe(false);
    session.set('battery', 'pulled');
    expect(systems(session).consumers.cockpitLight).toBe(false);
  });
});

describe('flaps', () => {
  it.each([
    ['without the main bus', 'battery', 'pulled'],
    ['with the flap breaker pulled', 'flapBreaker', 'pulled'],
  ])('do not move %s', (_, id, position) => {
    const session = sessionAt('parking');
    session.set('battery', 'in');
    session.set(id, position);
    session.set('flapSelector', '15');
    advanceSeconds(session, 20);
    expect(systems(session).flaps.angle).toBe(0);
  });

  it('travel to the selected setting, moving while they travel', () => {
    const session = sessionAt('parking');
    session.set('battery', 'in');
    session.set('flapSelector', '15');
    advanceSeconds(session, 1);
    expect(systems(session).flaps.moving).toBe(true);
    expect(systems(session).flaps.angle).toBeGreaterThan(0);
    expect(systems(session).flaps.angle).toBeLessThan(15);
    advanceSeconds(session, 20);
    expect(systems(session).flaps).toEqual({ angle: 15, moving: false });
    session.set('flapSelector', '-12');
    advanceSeconds(session, 30);
    expect(systems(session).flaps).toEqual({ angle: -12, moving: false });
  });

  it('do not extend past the max flap speed of the next setting', () => {
    const between = rig('approach', [], { airspeedKt: 70, altitudeFt: 500, onGround: false });
    expect(between.state().airspeedKmh).toBeGreaterThan(115);
    expect(between.state().airspeedKmh).toBeLessThan(148);
    between.set('flapSelector', '30');
    between.advance(30);
    expect(between.state().flaps).toEqual({ angle: 15, moving: true });
  });

  it('do not leave negative flaps above the max flap speed at 0°', () => {
    const cruise = rig('cruise');
    expect(cruise.state().airspeedKmh).toBeGreaterThan(184);
    cruise.set('flapSelector', '0');
    cruise.advance(30);
    expect(cruise.state().flaps).toEqual({ angle: -12, moving: true });
  });

  it('extend below the max flap speed', () => {
    const approach = rig('approach');
    expect(approach.state().airspeedKmh).toBeLessThan(115);
    approach.set('flapSelector', '30');
    approach.advance(30);
    expect(approach.state().flaps).toEqual({ angle: 30, moving: false });
  });

  it('are driven beyond the end detents by the override, to the end switch', () => {
    const session = sessionAt('parking');
    session.set('battery', 'in');
    session.set('flapSelector', 'override-up');
    advanceSeconds(session, 30);
    expect(systems(session).flaps.angle).toBeLessThan(-12);
    expect(systems(session).flaps.angle).toBeGreaterThan(-12 - END_SWITCH_OVERTRAVEL_MAX_DEG);
    expect(systems(session).flaps.moving).toBe(false);
    session.set('flapSelector', 'override-down');
    advanceSeconds(session, 60);
    expect(systems(session).flaps.angle).toBeGreaterThan(35);
    expect(systems(session).flaps.angle).toBeLessThan(35 + END_SWITCH_OVERTRAVEL_MAX_DEG);
    expect(systems(session).flaps.moving).toBe(false);
  });
});

describe('parking brake', () => {
  it('sets when the brake is applied with the valve closed, holds, and releases with the valve', () => {
    const session = sessionAt('taxiIn');
    expect(systems(session).parkingBrakeSet).toBe(false);
    session.set('parkingBrakeValve', 'closed');
    expect(systems(session).parkingBrakeSet).toBe(false);
    session.set('brake', 'on');
    expect(systems(session).parkingBrakeSet).toBe(true);
    session.set('brake', 'off');
    advanceSeconds(session, 5);
    expect(systems(session).parkingBrakeSet).toBe(true);
    session.set('parkingBrakeValve', 'open');
    expect(systems(session).parkingBrakeSet).toBe(false);
  });

  it('does not set when the brake is applied with the valve open', () => {
    const session = sessionAt('taxiIn');
    session.set('brake', 'on');
    session.set('brake', 'off');
    expect(systems(session).parkingBrakeSet).toBe(false);
  });

  it('does not set when the valve closes on a brake already applied', () => {
    const session = sessionAt('taxiIn');
    session.set('brake', 'on');
    session.set('parkingBrakeValve', 'closed');
    expect(systems(session).parkingBrakeSet).toBe(false);
  });

  it('stays set at holding while the valve stays closed', () => {
    const session = sessionAt('holding');
    session.set('brake', 'on');
    session.set('brake', 'off');
    expect(systems(session).parkingBrakeSet).toBe(true);
  });
});

describe('ELT and rescue system', () => {
  it('transmits with the ELT on', () => {
    const session = sessionAt('parking');
    expect(systems(session).eltTransmitting).toBe(false);
    session.set('elt', 'on');
    expect(systems(session).eltTransmitting).toBe(true);
  });

  it('deploys the rescue system once the handle is pulled, and stays deployed', () => {
    const session = sessionAt('cruise');
    session.openGuard('rescueHandle');
    session.set('rescueHandle', 'pulled');
    expect(systems(session).rescueDeployed).toBe(true);
    session.set('rescueHandle', 'stowed');
    expect(systems(session).rescueDeployed).toBe(true);
  });
});

describe('failures', () => {
  it('generatorFailure: no charging, charge lamp lit', () => {
    const failed = rig('cruise', ['generatorFailure']);
    expect(failed.state().bus.charging).toBe(false);
    expect(failed.state().bus.mainPowered).toBe(true);
    expect(rig('cruise').state().bus.charging).toBe(true);
  });

  it('engineStoppage: the engine stops and will not restart', () => {
    const failed = rig('cruise', ['engineStoppage']);
    failed.advance(1);
    expect(failed.state().engine.running).toBe(false);
    failed.set('ignition', 'start');
    failed.advance(5);
    failed.set('ignition', 'both');
    failed.advance(5);
    expect(failed.state().engine.running).toBe(false);
    expect(rig('cruise').state().engine.running).toBe(true);
  });

  it('engineFire: burns while fuel reaches the engine', () => {
    const failed = rig('cruise', ['engineFire']);
    failed.advance(10);
    expect(failed.state().fire).toBe(true);
    expect(rig('cruise').state().fire).toBe(false);
  });

  it('engineFire: goes out once the valve is closed and the engine has stopped', () => {
    const failed = rig('cruise', ['engineFire']);
    failed.set('fuelValve', 'closed');
    failed.advance(1);
    expect(failed.state().fire).toBe(true);
    const seconds = failed.secondsUntil((state) => !state.fire, 90);
    expect(seconds).toBeLessThan(90);
    expect(failed.state().engine.running).toBe(false);
  });

  it('engineFire: goes out sooner with the throttle full', () => {
    const out = (state: CtslState) => !state.fire;
    const cruise = rig('cruise', ['engineFire']);
    cruise.set('fuelValve', 'closed');
    const full = rig('cruise', ['engineFire']);
    full.set('fuelValve', 'closed');
    full.set('throttle', 'full');
    expect(full.secondsUntil(out, 90)).toBeLessThan(cruise.secondsUntil(out, 90));
  });

  it('engineFire: CHT and oil temperature climb past their red lines', () => {
    const failed = rig('cruise', ['engineFire']);
    failed.advance(30);
    expect(failed.state().chtC).toBeGreaterThan(CHT_RED_LINE_C);
    expect(failed.state().oilTempC).toBeGreaterThan(OIL_TEMP_RED_LINE_C);
  });

  it('engineFire: the temperatures fall once the fire is out', () => {
    const failed = rig('cruise', ['engineFire']);
    failed.set('fuelValve', 'closed');
    failed.secondsUntil((state) => !state.fire, 90);
    const out = failed.state();
    failed.advance(10);
    expect(failed.state().chtC).toBeLessThan(out.chtC);
    expect(failed.state().oilTempC).toBeLessThan(out.oilTempC);
  });

  it('coolantLoss: CHT climbs past the red line at cruise power', () => {
    const failed = rig('cruise', ['coolantLoss']);
    failed.advance(60);
    expect(failed.state().chtC).toBeGreaterThan(CHT_RED_LINE_C);
    const healthy = rig('cruise');
    healthy.advance(60);
    expect(healthy.state().chtC).toBeLessThan(CHT_RED_LINE_C);
  });

  it('coolantLoss: CHT holds below the red line at low power', () => {
    const failed = rig('cruise', ['coolantLoss']);
    failed.set('throttle', 'low');
    failed.advance(90);
    expect(failed.state().chtC).toBeLessThan(CHT_RED_LINE_C);
  });

  it('oilLoss: pressure falls to zero and oil temperature rises', () => {
    const failed = rig('cruise', ['oilLoss']);
    const before = failed.state();
    failed.advance(10);
    expect(failed.state().oilPressureBar).toBeLessThan(0.1);
    expect(failed.state().oilTempC).toBeGreaterThan(before.oilTempC);
    expect(failed.state().engine.running).toBe(true);
    failed.advance(50);
    expect(failed.state().oilTempC).toBeGreaterThan(OIL_TEMP_RED_LINE_C);
  });

  it('oilLoss: the engine stops later and stays stopped', () => {
    const failed = rig('cruise', ['oilLoss']);
    const seconds = failed.secondsUntil((state) => !state.engine.running, 90);
    expect(seconds).toBeGreaterThan(10);
    expect(seconds).toBeLessThan(90);
    failed.set('ignition', 'start');
    failed.advance(5);
    expect(failed.state().engine.running).toBe(false);
    expect(failed.state().rpm).toBe(0);
  });

  it('flapControlFailure: the detents have no effect', () => {
    const failed = rig('approach', ['flapControlFailure']);
    failed.set('flapSelector', '30');
    failed.advance(20);
    expect(failed.state().flaps).toEqual({ angle: 15, moving: false });
  });

  it('flapControlFailure: the override still drives the flaps', () => {
    const failed = rig('approach', ['flapControlFailure']);
    failed.set('flapSelector', 'override-down');
    failed.advance(1);
    expect(failed.state().flaps.moving).toBe(true);
    failed.advance(4);
    const driven = failed.state().flaps.angle;
    expect(driven).toBeGreaterThan(15);
    failed.set('flapSelector', '35');
    failed.advance(5);
    expect(failed.state().flaps).toEqual({ angle: driven, moving: false });
  });

  it('flapControlFailure: trips the flap breaker and darkens the flap readout', () => {
    const session = sessionAt('cruise');
    session.startProcedure('flapControlFailure');
    expect(session.state().controls['flapBreaker']).toBe('pulled');
    expect(indicators.flapReadout.select(trainerState(session))).toBe('');
  });

  it('flapControlFailure: with the breaker reset the readout holds against the selector', () => {
    const session = sessionAt('cruise');
    session.startProcedure('flapControlFailure');
    session.set('flapBreaker', 'in');
    session.set('flapSelector', '0');
    advanceSeconds(session, 10);
    expect(indicators.flapReadout.select(trainerState(session))).toBe(-12);
  });
});

describe('entry snapshots', () => {
  const running = (Object.keys(phases) as PhaseId[]).filter((id) => id !== 'parking');

  it.each(running)('enters %s warm, with oil pressure and CHT in the green', (id) => {
    const state = phases[id].entry.state;
    expect(state.oilTempC).toBeGreaterThanOrEqual(MIN_TAKEOFF_OIL_C);
    expect(state.oilTempC).toBeLessThan(OIL_TEMP_RED_LINE_C);
    expect(state.oilPressureBar).toBeGreaterThanOrEqual(2);
    expect(state.oilPressureBar).toBeLessThanOrEqual(5);
    expect(state.chtC).toBeLessThan(CHT_RED_LINE_C);
    expect(state.rpm).toBeGreaterThanOrEqual(1400);
  });

  it.each(running)('enters %s settled: the gauges hold still', (id) => {
    const session = sessionAt(id);
    const entry = systems(session);
    advanceSeconds(session, 30);
    const later = systems(session);
    expect(later.rpm).toBe(entry.rpm);
    expect(later.oilTempC).toBeCloseTo(entry.oilTempC, 1);
    expect(later.chtC).toBeCloseTo(entry.chtC, 1);
    expect(later.oilPressureBar).toBeCloseTo(entry.oilPressureBar, 1);
  });

  it('enters parking cold', () => {
    const state = phases.parking.entry.state;
    expect(state.oilTempC).toBeLessThan(MIN_TAKEOFF_OIL_C);
    expect(state.rpm).toBe(0);
    expect(state.oilPressureBar).toBe(0);
  });

  it('carries the airspeed of the environment in km/h', () => {
    expect(phases.cruise.entry.state.airspeedKmh).toBeCloseTo(108 * KMH_PER_KT);
  });
});

describe('indicators', () => {
  it('leave the flap readout dark while its circuit has no power', () => {
    const session = sessionAt('cruise');
    const readout = () => indicators.flapReadout.select(trainerState(session));
    expect(readout()).toBe(-12);
    session.set('flapBreaker', 'pulled');
    expect(readout()).toBe('');
    session.set('flapBreaker', 'in');
    session.set('battery', 'pulled');
    session.advance(STEP_MS);
    expect(readout()).toBe('');
    expect(indicators.flapReadout.select(trainerState(sessionAt('parking')))).toBe('');
  });

  it('follow the model after a start', () => {
    const session = coldStart();
    session.set('generator', 'in');
    session.set('flapSelector', '15');
    session.set('elt', 'on');
    advanceSeconds(session, 20);
    const state = trainerState(session);
    const read = (id: keyof typeof indicators) => indicators[id].select(state);
    expect(read('tachometer')).toBe(1400);
    expect(read('oilPressure')).toBeGreaterThanOrEqual(2);
    expect(read('oilTemperature')).toBeGreaterThan(phases.parking.entry.state.oilTempC);
    expect(read('cht')).toBeGreaterThan(phases.parking.entry.state.chtC);
    expect(read('chargeLamp')).toBe(false);
    expect(read('flapReadout')).toBe(15);
    expect(read('eltLamp')).toBe(true);
    expect(read('airspeed')).toBe(0);
    expect(read('altimeter')).toBe(0);
    expect(read('verticalSpeed')).toBe(0);
    for (const id of Object.keys(indicators) as (keyof typeof indicators)[]) {
      const value = read(id);
      expect(typeof value === 'number' ? Number.isFinite(value) : typeof value).toBeTruthy();
    }
  });
});

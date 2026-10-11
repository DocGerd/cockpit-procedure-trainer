import { createSession } from '@cpt/core';
import { expect, it } from 'vitest';
import { aircraftRegistry } from './aircraft-registry';
import { deviceRegistry, deviceScreens } from './device-registry';

it('has a screen for every registered device and no screen without a device', () => {
  const ids = deviceRegistry.map((device) => device.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(Object.keys(deviceScreens).sort()).toEqual([...ids].sort());
});

it('registers every device an aircraft installs', () => {
  const ids = new Set(deviceRegistry.map((device) => device.id));
  const installed = aircraftRegistry.flatMap((aircraft) =>
    Object.values(aircraft.devices ?? {}).map((install) => install.device),
  );
  expect(installed.filter((id) => !ids.has(id))).toEqual([]);
});

const ctslOf = () => {
  const ctsl = aircraftRegistry.find((aircraft) => aircraft.id === 'ctsl');
  if (!ctsl) throw new Error('CTSL is not registered');
  return ctsl;
};

it('enters the CTSL cruise phase squawking 7000 at ACS with the GPS fixed on its map page', () => {
  const ctsl = ctslOf();
  const session = createSession(ctsl, { devices: deviceRegistry, phase: 'cruise' });
  session.advance(100);
  expect(session.state().devices.xpdr?.state).toMatchObject({
    on: true,
    mode: 'acs',
    squawk: '7000',
    reporting: true,
  });
  const cruise = ctsl.phases.cruise;
  const { headingDeg } = cruise?.entry.state as { headingDeg: number };
  expect(session.state().devices.gps?.state).toMatchObject({
    on: true,
    page: 'map',
    fix: true,
    trackDeg: headingDeg,
  });
  const gps = session.state().devices.gps?.state as { groundSpeedKt: number };
  expect(gps.groundSpeedKt).toBeCloseTo(cruise?.environment.airspeedKt ?? Number.NaN);
  expect(session.state().devices.flarm?.state).toMatchObject({
    stage: 'ready',
    operational: true,
  });
});

it('enters the CTSL parking phase with every unit dark', () => {
  const session = createSession(ctslOf(), { devices: deviceRegistry, phase: 'parking' });
  session.advance(100);
  expect(session.state().devices.gps?.state).toMatchObject({ on: false, fix: false });
  expect(session.state().devices.com?.state).toMatchObject({ on: false });
  expect(session.state().devices.flarm?.state).toMatchObject({ powered: false });
});

it('enters the CTSL holding phase with the radio dark until I/O, the transponder off and the GPS at start-up', () => {
  const session = createSession(ctslOf(), { devices: deviceRegistry, phase: 'holding' });
  session.advance(100);
  expect(session.state().devices.com?.state).toMatchObject({
    on: false,
    powered: true,
    active: 118_000,
  });
  expect(session.state().devices.xpdr?.state).toMatchObject({ on: false, mode: 'stby' });
  expect(session.state().devices.gps?.state).toMatchObject({
    on: true,
    page: 'startup',
    fix: false,
  });
  expect(session.state().devices.flarm?.state).toMatchObject({
    stage: 'selfTest',
    operational: false,
  });
});

it('gives the CTSL GPS a fix with ground speed and track once accepted and its search is over', () => {
  const session = createSession(ctslOf(), { devices: deviceRegistry, phase: 'holding' });
  session.advance(100);
  session.press('gps.touch', 'accept');
  session.release('gps.touch');
  session.advance(1000);
  expect(session.state().devices.gps?.state).toMatchObject({ on: true, page: 'home', fix: false });
  session.advance(120_000);
  const gps = session.state().devices.gps?.state as {
    fix: boolean;
    groundSpeedKt: number | null;
    trackDeg: number | null;
  };
  expect(gps.fix).toBe(true);
  expect(gps.groundSpeedKt).not.toBeNull();
  expect(gps.trackDeg).not.toBeNull();
  expect(session.state().devices.flarm?.state).toMatchObject({ operational: true });
});

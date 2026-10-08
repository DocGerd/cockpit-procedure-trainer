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

it('enters the CTSL cruise phase squawking 7000 at ALT with the GPS fixed on its map page', () => {
  const ctsl = aircraftRegistry.find((aircraft) => aircraft.id === 'ctsl');
  if (!ctsl) throw new Error('CTSL is not registered');
  const session = createSession(ctsl, { devices: deviceRegistry, phase: 'cruise' });
  session.advance(100);
  expect(session.state().controls['xpdr.mode']).toBe('alt');
  expect(session.state().devices.xpdr?.state).toMatchObject({ mode: 'alt', squawk: '7000' });
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
});

it.each(['parking', 'holding'] as const)(
  'enters the CTSL %s phase with the GPS dark and without a fix',
  (phase) => {
    const ctsl = aircraftRegistry.find((aircraft) => aircraft.id === 'ctsl');
    if (!ctsl) throw new Error('CTSL is not registered');
    const session = createSession(ctsl, { devices: deviceRegistry, phase });
    session.advance(100);
    expect(session.state().devices.gps?.state).toMatchObject({ on: false, fix: false });
  },
);

it('gives the CTSL GPS a fix with ground speed and track after a manual switch-on and the search', () => {
  const ctsl = aircraftRegistry.find((aircraft) => aircraft.id === 'ctsl');
  if (!ctsl) throw new Error('CTSL is not registered');
  const session = createSession(ctsl, { devices: deviceRegistry, phase: 'holding' });
  session.advance(100);
  session.press('gps.power');
  session.advance(1000);
  expect(session.state().devices.gps?.state).toMatchObject({ on: true, fix: false });
  session.advance(120_000);
  const gps = session.state().devices.gps?.state as {
    fix: boolean;
    groundSpeedKt: number | null;
    trackDeg: number | null;
  };
  expect(gps.fix).toBe(true);
  expect(gps.groundSpeedKt).not.toBeNull();
  expect(gps.trackDeg).not.toBeNull();
});

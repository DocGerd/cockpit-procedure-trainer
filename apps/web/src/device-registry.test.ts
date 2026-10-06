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

import { formatFinding, validateAircraft } from '@cpt/core';
import type { Aircraft, CockpitCell } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { aircraftRegistry } from './aircraft-registry';
import { deviceRegistry } from './device-registry';

it('has no validation findings in any registered aircraft', () => {
  const findings = aircraftRegistry.flatMap((aircraft) =>
    validateAircraft(aircraft, { devices: deviceRegistry }),
  );
  expect(findings.map(formatFinding)).toEqual([]);
});

type Floor = { readonly width: number; readonly height: number };

/**
 * Why the dock cannot hold a device of this floor. The dock renders at least `minWidth` wide, and
 * its height grows with its width at the cell's own aspect, so the smallest dock is that width and
 * the height it brings.
 */
function dockProblems(dock: CockpitCell, floor: Floor): string[] {
  const smallest = { width: dock.minWidth, height: (dock.minWidth * dock.rect.h) / dock.rect.w };
  return [
    ...(smallest.width < floor.width
      ? [`dock width ${smallest.width} < floor ${floor.width}`]
      : []),
    ...(smallest.height < floor.height
      ? [`dock height ${smallest.height} < floor ${floor.height}`]
      : []),
  ];
}

// Until the device registry exports floors this finds none, so the check below fails on any
// aircraft that declares a dock; switch it to `deviceEntries` once the floors exist.
const registeredFloors: Readonly<Record<string, Floor>> = {};
const registeredFloor = (deviceId: string): Floor | undefined =>
  Object.hasOwn(registeredFloors, deviceId) ? registeredFloors[deviceId] : undefined;

const installedFloors = (aircraft: Aircraft): [string, Floor | undefined][] =>
  [...new Set(Object.values(aircraft.devices ?? {}).map(({ device }) => device))].map((id) => [
    id,
    registeredFloor(id),
  ]);

describe('the device dock reaches every installed device floor', () => {
  const dock = { rect: { x: 0, y: 0, w: 400, h: 200 }, minWidth: 300 };

  it('accepts a dock at least as wide and as tall as the floor', () => {
    expect(dockProblems(dock, { width: 300, height: 150 })).toEqual([]);
  });

  it('reports a floor wider than the dock', () => {
    expect(dockProblems(dock, { width: 301, height: 100 })).toEqual(['dock width 300 < floor 301']);
  });

  it('reports a floor taller than the dock at its narrowest', () => {
    expect(dockProblems(dock, { width: 100, height: 151 })).toEqual([
      'dock height 150 < floor 151',
    ]);
  });

  it('holds for every registered aircraft that declares a dock', () => {
    const problems = aircraftRegistry.flatMap((aircraft) => {
      const declared = aircraft.cockpit?.dock;
      if (!declared) return [];
      return installedFloors(aircraft).flatMap(([deviceId, floor]) =>
        floor
          ? dockProblems(declared, floor).map((problem) => `${aircraft.id}/${deviceId}: ${problem}`)
          : [`${aircraft.id}/${deviceId}: no floor known`],
      );
    });
    expect(problems).toEqual([]);
  });
});

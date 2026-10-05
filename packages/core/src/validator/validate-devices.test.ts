import { describe, expect, it } from 'vitest';
import type { Aircraft } from '../contract';
import { engineMonitor, fixtureDeviceAircraft } from '../devices/fixtures';
import { formatFinding, validateAircraft } from './validate-aircraft';
import type { Finding } from './validate-aircraft';

const context = { devices: [engineMonitor] };
const text = { de: 'a', en: 'a' };
const install = fixtureDeviceAircraft.devices?.mon;

const withInstalls = (devices: Record<string, unknown>): Aircraft =>
  ({ ...fixtureDeviceAircraft, devices }) as Aircraft;

const withItems = (items: readonly unknown[]): Aircraft =>
  ({
    ...fixtureDeviceAircraft,
    procedures: {
      ...fixtureDeviceAircraft.procedures,
      monitorElectrical: { ...fixtureDeviceAircraft.procedures.monitorElectrical, items },
    },
  }) as Aircraft;

const codes = (aircraft: Aircraft, ctx = context): Finding[] => validateAircraft(aircraft, ctx);

describe('validateAircraft with devices', () => {
  it('finds nothing in an aircraft whose installs and targets are all declared', () => {
    expect(codes(fixtureDeviceAircraft).map(formatFinding)).toEqual([]);
  });

  it('reports an install that names an unregistered device', () => {
    const [finding, ...rest] = codes(withInstalls({ mon: { ...install, device: 'radio' } }));
    expect(rest).toEqual([]);
    expect(finding).toMatchObject({ code: 'unknown-device', id: 'radio' });
    expect(finding?.message).toContain('mon');
  });

  it('reports every install when no device list is passed', () => {
    const findings = validateAircraft(fixtureDeviceAircraft);
    expect(findings.filter((f) => f.code === 'unknown-device').map((f) => f.id)).toContain(
      'engineMonitor',
    );
  });

  it('reports an install placed in a view the aircraft does not have', () => {
    const [finding, ...rest] = codes(withInstalls({ mon: { ...install, view: 'nowhere' } }));
    expect(rest.filter((f) => f.code !== 'unknown-device-control')).toEqual([]);
    expect(finding).toMatchObject({ code: 'unplaced-device', id: 'mon' });
  });

  it('reports an action on a control the device does not have', () => {
    const aircraft = withItems([{ type: 'action', control: 'mon.volume', position: 'high', text }]);
    expect(codes(aircraft)).toEqual([
      expect.objectContaining({ code: 'unknown-device-control', id: 'mon.volume' }),
    ]);
  });

  it('reports a check on a control the device does not have', () => {
    const aircraft = withItems([
      { type: 'check', target: { control: 'mon.volume' }, condition: () => true, text },
    ]);
    expect(codes(aircraft)).toEqual([
      expect.objectContaining({ code: 'unknown-device-control', id: 'mon.volume' }),
    ]);
  });

  it('reports a target namespaced by an install the aircraft does not have', () => {
    const aircraft = withItems([{ type: 'action', control: 'gps.page', position: 'x', text }]);
    expect(codes(aircraft)).toEqual([
      expect.objectContaining({ code: 'unknown-device', id: 'gps.page' }),
    ]);
  });

  it('reports a position the device control does not have', () => {
    const aircraft = withItems([
      { type: 'action', control: 'mon.page', position: 'weather', text },
    ]);
    expect(codes(aircraft)).toEqual([
      expect.objectContaining({ code: 'unknown-position', id: 'mon.page' }),
    ]);
  });

  it('still reports a target with no namespace as an unknown aircraft control', () => {
    const aircraft = withItems([{ type: 'action', control: 'page', position: 'x', text }]);
    expect(codes(aircraft)).toEqual([
      expect.objectContaining({ code: 'unknown-target', id: 'page' }),
    ]);
  });

  it('keeps an aircraft control whose id contains a dot an aircraft control', () => {
    const aircraft = {
      ...fixtureDeviceAircraft,
      controls: {
        ...fixtureDeviceAircraft.controls,
        'mon.alias': fixtureDeviceAircraft.controls.master,
      },
      views: {
        ...fixtureDeviceAircraft.views,
        panel: {
          ...fixtureDeviceAircraft.views.panel,
          controls: {
            ...fixtureDeviceAircraft.views.panel?.controls,
            'mon.alias': { rect: { x: 0, y: 0, w: 1, h: 1 } },
          },
        },
      },
      phases: {
        ...fixtureDeviceAircraft.phases,
        parking: {
          ...fixtureDeviceAircraft.phases.parking,
          entry: {
            ...fixtureDeviceAircraft.phases.parking?.entry,
            controls: {
              ...fixtureDeviceAircraft.phases.parking?.entry.controls,
              'mon.alias': 'off',
            },
          },
        },
        runup: {
          ...fixtureDeviceAircraft.phases.runup,
          entry: {
            ...fixtureDeviceAircraft.phases.runup?.entry,
            controls: {
              ...fixtureDeviceAircraft.phases.runup?.entry.controls,
              'mon.alias': 'off',
            },
          },
        },
      },
    } as unknown as Aircraft;
    const withTarget = {
      ...aircraft,
      procedures: {
        ...aircraft.procedures,
        monitorElectrical: {
          ...aircraft.procedures.monitorElectrical,
          items: [{ type: 'action', control: 'mon.alias', position: 'on', text }],
        },
      },
    } as Aircraft;
    expect(codes(withTarget)).toEqual([]);
  });
});

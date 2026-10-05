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
    expect(codes(withInstalls({ mon: { ...install, view: 'nowhere' } }))).toEqual([
      expect.objectContaining({ code: 'unplaced-device', id: 'mon' }),
    ]);
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

  it('reports an aircraft control inside an install namespace', () => {
    const aircraft = {
      ...fixtureDeviceAircraft,
      controls: {
        ...fixtureDeviceAircraft.controls,
        'mon.alias': fixtureDeviceAircraft.controls.master,
      },
    } as Aircraft;
    const found = codes(aircraft).filter((f) => f.code === 'control-in-device-namespace');
    expect(found).toEqual([expect.objectContaining({ id: 'mon.alias' })]);
  });

  it('allows an aircraft control with a dot outside every install namespace', () => {
    const aircraft = {
      ...fixtureDeviceAircraft,
      controls: {
        ...fixtureDeviceAircraft.controls,
        'fuel.pump': fixtureDeviceAircraft.controls.master,
      },
    } as Aircraft;
    expect(codes(aircraft).filter((f) => f.code === 'control-in-device-namespace')).toEqual([]);
  });

  it('reports an install id that contains a dot', () => {
    const aircraft = withInstalls({ 'mon.a': install, mon: install });
    expect(codes(aircraft)).toEqual([
      expect.objectContaining({ code: 'invalid-install-id', id: 'mon.a' }),
    ]);
  });
});

describe('device texts', () => {
  const withDevice = (patch: Record<string, unknown>) => ({
    devices: [{ ...engineMonitor, ...patch }],
  });
  const missing = (patch: Record<string, unknown>) =>
    validateAircraft(fixtureDeviceAircraft, withDevice(patch)).filter(
      (f) => f.code === 'missing-translation',
    );

  it('finds nothing in a device whose texts are complete', () => {
    expect(missing({})).toEqual([]);
  });

  it('reports an empty manual', () => {
    expect(missing({ manual: { de: 'a', en: ' ' } })).toEqual([
      expect.objectContaining({ id: 'engineMonitor', message: 'manual: empty en' }),
    ]);
  });

  it('reports an empty notModelled entry', () => {
    expect(missing({ notModelled: [{ de: '', en: 'a' }] })).toEqual([
      expect.objectContaining({ id: 'engineMonitor', message: 'notModelled 0: empty de' }),
    ]);
  });

  it('reports a control name and description', () => {
    const page = engineMonitor.controls.page as Record<string, unknown>;
    const found = missing({
      controls: { page: { ...page, name: { de: 'a' }, description: { de: 'a', en: '' } } },
    });
    expect(found.map((f) => [f.id, f.message])).toEqual([
      ['engineMonitor.page', 'name: empty en'],
      ['engineMonitor.page', 'description: empty en'],
    ]);
  });

  it('reports a guard name', () => {
    const page = engineMonitor.controls.page as Record<string, unknown>;
    const found = missing({
      controls: { page: { ...page, kind: 'guarded', guard: { name: { de: '', en: 'a' } } } },
    });
    expect(found).toEqual([
      expect.objectContaining({ id: 'engineMonitor.page', message: 'guard name: empty de' }),
    ]);
  });

  it('checks a device once however many installs name it', () => {
    const twice = {
      ...fixtureDeviceAircraft,
      devices: { ...fixtureDeviceAircraft.devices, mon2: install },
    } as Aircraft;
    const found = validateAircraft(twice, withDevice({ manual: { de: '', en: 'a' } }));
    expect(found.filter((f) => f.code === 'missing-translation')).toHaveLength(1);
  });
});

describe('phase entry device positions', () => {
  const withEntryDevices = (devices: unknown): Aircraft => {
    const parking = fixtureDeviceAircraft.phases.parking;
    return {
      ...fixtureDeviceAircraft,
      phases: {
        ...fixtureDeviceAircraft.phases,
        parking: { ...parking, entry: { ...parking?.entry, devices } },
      },
    } as Aircraft;
  };

  it('accepts a declared install, control and position', () => {
    expect(codes(withEntryDevices({ mon: { page: 'electrical' } }))).toEqual([]);
  });

  it('reports an install the aircraft does not have', () => {
    expect(codes(withEntryDevices({ gps: { page: 'engine' } }))).toEqual([
      expect.objectContaining({ code: 'unknown-device', id: 'gps' }),
    ]);
  });

  it('reports a control the device does not have', () => {
    expect(codes(withEntryDevices({ mon: { volume: 'high' } }))).toEqual([
      expect.objectContaining({ code: 'unknown-device-control', id: 'mon.volume' }),
    ]);
  });

  it('reports a position the device control does not have', () => {
    expect(codes(withEntryDevices({ mon: { page: 'weather' } }))).toEqual([
      expect.objectContaining({ code: 'unknown-position', id: 'mon.page' }),
    ]);
  });
});

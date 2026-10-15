import { describe, expect, it } from 'vitest';
import type { Aircraft, Device } from '../contract';
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

describe('phase entry device state', () => {
  const withDeviceStates = (deviceStates: unknown): Aircraft => {
    const parking = fixtureDeviceAircraft.phases.parking;
    return {
      ...fixtureDeviceAircraft,
      phases: {
        ...fixtureDeviceAircraft.phases,
        parking: { ...parking, entry: { ...parking?.entry, deviceStates } },
      },
    } as Aircraft;
  };

  it('accepts a field the device state has, of the same type', () => {
    expect(codes(withDeviceStates({ mon: { page: 'electrical', reading: 3 } }))).toEqual([]);
  });

  it('reports an install the aircraft does not have', () => {
    expect(codes(withDeviceStates({ gps: { page: 'engine' } }))).toEqual([
      expect.objectContaining({ code: 'unknown-device', id: 'gps' }),
    ]);
  });

  it('reports a field the device state does not have', () => {
    expect(codes(withDeviceStates({ mon: { volume: 3 } }))).toEqual([
      expect.objectContaining({ code: 'unknown-device-state', id: 'mon.volume' }),
    ]);
  });

  it.each([[null], [[]], [{}]])('reports %j where the field holds a string', (value) => {
    expect(codes(withDeviceStates({ mon: { page: value } }))).toEqual([
      expect.objectContaining({ code: 'unknown-device-state', id: 'mon.page' }),
    ]);
  });

  it('accepts any value for a field whose starting value is null', () => {
    expect(codes(withDeviceStates({ mon: { reading: 'high' } }))).toEqual([]);
  });

  it('reports a value of another type than the field', () => {
    expect(codes(withDeviceStates({ mon: { page: 3 } }))).toEqual([
      expect.objectContaining({ code: 'unknown-device-state', id: 'mon.page' }),
    ]);
  });
});

describe('inexact-lever-target on a device control', () => {
  const gain = {
    kind: 'lever',
    positions: 'continuous',
    initial: 0,
    name: text,
    description: text,
  };
  const leveredMonitor = {
    ...engineMonitor,
    controls: { ...engineMonitor.controls, gain },
  } as unknown as Device;
  const action = (position: unknown) =>
    codes(withItems([{ type: 'action', control: 'mon.gain', position, text }]), {
      devices: [leveredMonitor],
    });

  it('reports an in-between target', () => {
    expect(action(0.5)).toEqual([
      expect.objectContaining({ code: 'inexact-lever-target', id: 'mon.gain' }),
    ]);
  });

  it.each([0, 1])('accepts the stop %s', (value) => {
    expect(action(value)).toEqual([]);
  });
});

describe('legends of a device control', () => {
  const withLegends = (legends: unknown) =>
    codes(fixtureDeviceAircraft, {
      devices: [
        {
          ...engineMonitor,
          controls: { page: { ...engineMonitor.controls.page, legends } },
        } as unknown as Device,
      ],
    });

  it('accepts a legend and a phrase on positions the control has', () => {
    expect(withLegends({ engine: 'ENG', electrical: { state: text, restore: text } })).toEqual([]);
  });

  it('reports a legend on a position the control does not have', () => {
    expect(withLegends({ weather: 'WX' })).toEqual([
      expect.objectContaining({ code: 'unknown-position', id: 'engineMonitor.page' }),
    ]);
  });

  it('reports an empty legend and an untranslated phrase', () => {
    expect(
      withLegends({ engine: ' ', electrical: { state: { de: 'a', en: '' }, restore: text } }),
    ).toEqual([
      expect.objectContaining({ code: 'missing-translation', id: 'engineMonitor.page' }),
      expect.objectContaining({ code: 'missing-translation', id: 'engineMonitor.page' }),
    ]);
  });
});

describe('validateAircraft sounds', () => {
  const soundsOf = (beeps: unknown, id = 'beeper'): Device =>
    ({ ...engineMonitor, id, sounds: { beeps, cues: () => [] } }) as Device;
  const toneFindings = (context?: { devices?: readonly Device[] }) =>
    validateAircraft(fixtureDeviceAircraft, context).filter(
      (finding) => finding.code === 'invalid-tone' || finding.code === 'beep-without-tones',
    );
  const sounded = (beeps: unknown) => toneFindings({ devices: [engineMonitor, soundsOf(beeps)] });
  const finding = (code: string, id: string, message: string) =>
    expect.objectContaining({ code, id, message });

  it('finds nothing in valid beeps', () => {
    expect(
      sounded({
        a: [
          { hz: 880, ms: 100 },
          { hz: 440, ms: 50, pauseMs: 0 },
        ],
      }),
    ).toEqual([]);
  });

  it('checks a device the aircraft does not install', () => {
    expect(sounded({ a: [{ hz: 0, ms: 100 }] })).toEqual([
      finding('invalid-tone', 'beeper.a', 'tone 0 needs a finite, positive hz'),
    ]);
  });

  it('checks a device the aircraft installs, once', () => {
    const installed = soundsOf({ a: [{ hz: 0, ms: 100 }] }, engineMonitor.id);
    expect(toneFindings({ devices: [installed] })).toEqual([
      finding('invalid-tone', 'engineMonitor.a', 'tone 0 needs a finite, positive hz'),
    ]);
  });

  it('checks no beeps without devices in the context', () => {
    expect(toneFindings()).toEqual([]);
  });

  it.each([
    ['hz zero', { hz: 0, ms: 100 }, 'hz'],
    ['hz negative', { hz: -1, ms: 100 }, 'hz'],
    ['hz infinite', { hz: Infinity, ms: 100 }, 'hz'],
    ['hz -Infinity', { hz: -Infinity, ms: 100 }, 'hz'],
    ['hz NaN', { hz: NaN, ms: 100 }, 'hz'],
    ['ms zero', { hz: 440, ms: 0 }, 'ms'],
    ['ms negative', { hz: 440, ms: -5 }, 'ms'],
    ['ms infinite', { hz: 440, ms: Infinity }, 'ms'],
    ['ms -Infinity', { hz: 440, ms: -Infinity }, 'ms'],
    ['ms NaN', { hz: 440, ms: NaN }, 'ms'],
  ])('reports a tone with %s', (_name, tone, field) => {
    expect(sounded({ a: [tone] })).toEqual([
      finding('invalid-tone', 'beeper.a', `tone 0 needs a finite, positive ${field}`),
    ]);
  });

  it.each([
    ['negative', -1],
    ['infinite', Infinity],
    ['NaN', NaN],
  ])('reports a tone whose pauseMs is %s', (_name, pauseMs) => {
    expect(sounded({ a: [{ hz: 440, ms: 100, pauseMs }] })).toEqual([
      finding('invalid-tone', 'beeper.a', 'tone 0 needs a finite pauseMs of at least 0'),
    ]);
  });

  it('names every bad field of a tone', () => {
    expect(sounded({ a: [{ hz: 0, ms: NaN, pauseMs: -1 }] }).map(({ message }) => message)).toEqual(
      [
        'tone 0 needs a finite, positive hz',
        'tone 0 needs a finite, positive ms',
        'tone 0 needs a finite pauseMs of at least 0',
      ],
    );
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['number', 440],
  ])('reports an entry that is not a tone (%s)', (kind, tone) => {
    expect(sounded({ a: [tone] })).toEqual([
      finding('invalid-tone', 'beeper.a', `tone 0 is not a tone (${kind})`),
    ]);
  });

  it('reports a beep without tones', () => {
    expect(sounded({ a: [] })).toEqual([
      finding('beep-without-tones', 'beeper.a', 'the beep has no tones'),
    ]);
  });

  it.each([
    ['undefined', undefined],
    ['string', 'beep'],
    ['object', { hz: 440, ms: 100 }],
  ])('reports tones that are not a list (%s)', (kind, tones) => {
    expect(sounded({ a: tones })).toEqual([
      finding('beep-without-tones', 'beeper.a', `the tones are not a list (${kind})`),
    ]);
  });

  it('reports each bad tone of a beep', () => {
    expect(
      sounded({
        a: [
          { hz: 0, ms: 100 },
          { hz: 440, ms: 100 },
          { hz: 440, ms: -1 },
        ],
      }).map((finding) => finding.message),
    ).toEqual(['tone 0 needs a finite, positive hz', 'tone 2 needs a finite, positive ms']);
  });

  it('keeps the id of each beep on each device', () => {
    const bad = [{ hz: 0, ms: 100 }];
    const devices = [
      engineMonitor,
      soundsOf({ a: bad, b: [], c: [{ hz: 440, ms: 100 }] }),
      soundsOf({ a: bad }, 'other'),
    ];
    expect(toneFindings({ devices }).map(({ id }) => id)).toEqual([
      'beeper.a',
      'beeper.b',
      'other.a',
    ]);
  });

  it('ignores an empty beeps record', () => {
    expect(sounded({})).toEqual([]);
  });

  it('ignores sounds without beeps', () => {
    expect(sounded(undefined)).toEqual([]);
  });
});

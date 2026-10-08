import { describe, expect, it } from 'vitest';
import { fixtureAircraft } from '../contract/fixtures';
import type { Aircraft, ControlDefinition } from '../contract';
import { formatFinding, validateAircraft } from './validate-aircraft';
import type { Finding } from './validate-aircraft';

type Patch = Partial<Record<keyof Aircraft, unknown>>;

const broken = (patch: Patch): Aircraft => ({ ...fixtureAircraft, ...patch }) as Aircraft;

const withControl = (id: string, patch: Record<string, unknown>): Aircraft =>
  broken({
    controls: {
      ...fixtureAircraft.controls,
      [id]: { ...fixtureAircraft.controls[id], ...patch } as ControlDefinition,
    },
  });

const withPhase = (id: string, patch: Record<string, unknown>): Aircraft =>
  broken({
    phases: { ...fixtureAircraft.phases, [id]: { ...fixtureAircraft.phases[id], ...patch } },
  });

const withEntry = (id: string, controls: Record<string, unknown>): Aircraft =>
  withPhase(id, {
    entry: {
      ...fixtureAircraft.phases[id]?.entry,
      controls: { ...fixtureAircraft.phases[id]?.entry.controls, ...controls },
    },
  });

const withItems = (procedure: string, items: readonly unknown[]): Aircraft =>
  broken({
    procedures: {
      ...fixtureAircraft.procedures,
      [procedure]: { ...fixtureAircraft.procedures[procedure], items },
    },
  });

const beforeStartItems = fixtureAircraft.procedures.beforeStart?.items ?? [];
const text = { de: 'a', en: 'a' };

const only = (aircraft: Aircraft, code: Finding['code'], id: string): Finding => {
  const found = validateAircraft(aircraft).filter((f) => f.code === code && f.id === id);
  expect(found).toHaveLength(1);
  const [finding] = found as [Finding];
  expect(finding.aircraftId).toBe(aircraft.id);
  return finding;
};

const ofCode = (aircraft: Aircraft, code: Finding['code']): Finding[] =>
  validateAircraft(aircraft).filter((f) => f.code === code);

describe('validateAircraft', () => {
  it('finds nothing in the contract fixture', () => {
    expect(validateAircraft(fixtureAircraft)).toEqual([]);
  });

  it('accepts a context', () => {
    expect(validateAircraft(fixtureAircraft, {})).toEqual([]);
  });

  describe('unknown-target', () => {
    it('reports an action on an unknown control', () => {
      const aircraft = withItems('beforeStart', [
        { type: 'action', control: 'ghost', position: 'on', text },
      ]);
      only(aircraft, 'unknown-target', 'ghost');
    });

    it('reports a check on an unknown indicator and on an unknown control', () => {
      const condition = () => true;
      const aircraft = withItems('beforeStart', [
        { type: 'check', target: { indicator: 'ghostGauge' }, condition, text },
        { type: 'check', target: { control: 'ghostSwitch' }, condition, text },
      ]);
      only(aircraft, 'unknown-target', 'ghostGauge');
      only(aircraft, 'unknown-target', 'ghostSwitch');
    });

    it.each(['startPhase', 'endPhase'])('reports a procedure %s that does not exist', (field) => {
      const aircraft = broken({
        procedures: {
          beforeStart: { ...fixtureAircraft.procedures.beforeStart, [field]: 'ghostPhase' },
        },
      });
      const finding = only(aircraft, 'unknown-target', 'ghostPhase');
      expect(finding.message).toContain(field);
    });

    it('reports a placement of an unknown control or indicator', () => {
      const placement = { rect: { x: 0, y: 0, w: 1, h: 1 } };
      const view = fixtureAircraft.views.panel;
      const aircraft = broken({
        views: {
          panel: {
            ...view,
            controls: { ...view?.controls, ghostSwitch: placement },
            indicators: { ...view?.indicators, ghostGauge: placement },
          },
          console: fixtureAircraft.views.console,
        },
      });
      only(aircraft, 'unknown-target', 'ghostSwitch');
      only(aircraft, 'unknown-target', 'ghostGauge');
    });

    it('reports a phase entry for an unknown control', () => {
      only(withEntry('parking', { ghost: 'on' }), 'unknown-target', 'ghost');
    });

    it('reports an entry guard on an unknown control or a control without a guard', () => {
      const parking = fixtureAircraft.phases.parking;
      const aircraft = withPhase('parking', {
        entry: { ...parking?.entry, guards: { ghost: 'open', master: 'open' } },
      });
      only(aircraft, 'unknown-target', 'ghost');
      only(aircraft, 'unknown-target', 'master');
    });

    it('reports an entry guard position other than open or closed', () => {
      const parking = fixtureAircraft.phases.parking;
      const aircraft = withPhase('parking', {
        entry: { ...parking?.entry, guards: { fuelPump: 'ajar' } },
      });
      only(aircraft, 'unknown-position', 'fuelPump');
    });

    it('reports a failure that trips an unknown or non-breaker control', () => {
      const aircraft = broken({
        failures: {
          alternatorFailure: {
            ...fixtureAircraft.failures.alternatorFailure,
            trips: ['ghost', 'master'],
          },
        },
      });
      only(aircraft, 'unknown-target', 'ghost');
      only(aircraft, 'unknown-target', 'master');
    });
  });

  it('reports an unplaced control', () => {
    const aircraft = broken({
      controls: { ...fixtureAircraft.controls, orphan: fixtureAircraft.controls.flaps },
    });
    only(aircraft, 'unplaced-control', 'orphan');
  });

  it('reports an unplaced indicator', () => {
    const aircraft = broken({
      indicators: { ...fixtureAircraft.indicators, orphan: fixtureAircraft.indicators.rpm },
    });
    only(aircraft, 'unplaced-indicator', 'orphan');
  });

  describe('missing-translation', () => {
    it('reports an empty de or en on a control', () => {
      const aircraft = withControl('master', {
        name: { de: '', en: 'Master switch' },
        description: { de: 'x', en: '  ' },
      });
      const found = ofCode(aircraft, 'missing-translation');
      expect(found.map((f) => f.id)).toEqual(['master', 'master']);
      expect(found[0]?.message).toContain('name');
      expect(found[1]?.message).toContain('description');
    });

    it('reports a phase name', () => {
      const aircraft = withPhase('parking', { name: { de: 'Parkposition', en: '' } });
      only(aircraft, 'missing-translation', 'parking');
    });

    it('reports a procedure title and an item text', () => {
      const aircraft = broken({
        procedures: {
          beforeStart: {
            ...fixtureAircraft.procedures.beforeStart,
            title: { de: '', en: 'x' },
            items: [{ type: 'confirm', text: { de: 'x', en: '' } }],
          },
        },
      });
      const found = ofCode(aircraft, 'missing-translation');
      expect(found.map((f) => f.id)).toEqual(['beforeStart', 'beforeStart']);
    });

    it('reports aircraft, indicator, view, failure and guard texts', () => {
      const empty = { de: '', en: '' };
      const aircraft = broken({
        name: empty,
        indicators: { rpm: { ...fixtureAircraft.indicators.rpm, name: empty } },
        views: { panel: { ...fixtureAircraft.views.panel, name: empty } },
        failures: {
          alternatorFailure: { ...fixtureAircraft.failures.alternatorFailure, name: empty },
        },
        controls: { fuelPump: { ...fixtureAircraft.controls.fuelPump, guard: { name: empty } } },
      });
      const ids = ofCode(aircraft, 'missing-translation').map((f) => f.id);
      expect(ids).toEqual(
        expect.arrayContaining(['fixture', 'rpm', 'panel', 'alternatorFailure', 'fuelPump']),
      );
    });

    it('reports an empty handbook revision', () => {
      const aircraft = broken({ handbookRevision: { de: '', en: 'rev 1' } });
      const found = ofCode(aircraft, 'missing-translation');
      expect(found.map((f) => f.id)).toEqual(['fixture']);
      expect(found[0]?.message).toContain('handbookRevision');
    });
  });

  it('reports a phase without an image', () => {
    only(withPhase('parking', { image: '' }), 'phase-without-image', 'parking');
  });

  describe('running image', () => {
    const engineRunning = () => true;

    it('accepts a running image with an engineRunning condition', () => {
      const phases = Object.fromEntries(
        Object.entries(fixtureAircraft.phases).map(([id, phase]) => [
          id,
          { ...phase, imageRunning: 'running.svg' },
        ]),
      );
      const aircraft = { ...fixtureAircraft, phases, engineRunning } as Aircraft;
      expect(validateAircraft(aircraft)).toEqual([]);
    });

    it('reports a running image without an engineRunning condition', () => {
      only(
        withPhase('parking', { imageRunning: 'running.svg' }),
        'running-image-without-engine',
        'parking',
      );
    });

    it('reports a phase without a running image when the aircraft declares engineRunning', () => {
      const aircraft = { ...fixtureAircraft, engineRunning } as Aircraft;
      const found = ofCode(aircraft, 'phase-without-running-image');
      expect(found.map((f) => f.id).sort()).toEqual(Object.keys(fixtureAircraft.phases).sort());
    });

    it('reports an empty running image', () => {
      const aircraft = { ...withPhase('parking', { imageRunning: '' }), engineRunning };
      only(aircraft, 'phase-without-image', 'parking');
    });
  });

  describe('phase-without-snapshot', () => {
    it('reports a phase with no entry', () => {
      only(withPhase('parking', { entry: undefined }), 'phase-without-snapshot', 'parking');
    });

    it('reports an entry with no state', () => {
      const entry = { controls: fixtureAircraft.phases.parking?.entry.controls };
      only(withPhase('parking', { entry }), 'phase-without-snapshot', 'parking');
    });

    it('reports an entry that leaves a control out', () => {
      const controls = Object.fromEntries(
        Object.entries(fixtureAircraft.phases.parking?.entry.controls ?? {}).filter(
          ([id]) => id !== 'flaps',
        ),
      );
      const entry = { ...fixtureAircraft.phases.parking?.entry, controls };
      const finding = only(withPhase('parking', { entry }), 'phase-without-snapshot', 'parking');
      expect(finding.message).toContain('flaps');
    });
  });

  it('reports an emergency procedure whose failure is not declared', () => {
    const aircraft = broken({
      procedures: {
        alternatorFailure: { ...fixtureAircraft.procedures.alternatorFailure, failure: 'ghost' },
      },
    });
    only(aircraft, 'undeclared-failure', 'ghost');
  });

  describe('unknown-position', () => {
    it('reports an initial position the control does not have', () => {
      const finding = only(
        withControl('master', { initial: 'half' }),
        'unknown-position',
        'master',
      );
      expect(finding.message).toContain('half');
    });

    it.each([[['in', 'pulled', 'tripped']], [['pulled', 'in']], [['in']]])(
      'reports breaker positions %j that are not exactly in and pulled',
      (positions) => {
        const finding = only(
          withControl('alternatorBreaker', { positions }),
          'unknown-position',
          'alternatorBreaker',
        );
        expect(finding.message).toContain('positions');
      },
    );

    it('reports a non-number initial on a continuous lever', () => {
      only(withControl('throttle', { initial: 'idle' }), 'unknown-position', 'throttle');
    });

    it.each([1.5, -1, Number.NaN, Number.POSITIVE_INFINITY])(
      'reports a continuous lever value %s outside 0 to 1',
      (value) => {
        only(withControl('throttle', { initial: value }), 'unknown-position', 'throttle');
        only(withEntry('parking', { throttle: value }), 'unknown-position', 'throttle');
        const aircraft = withItems('beforeStart', [
          { type: 'action', control: 'throttle', position: value, text },
          ...beforeStartItems.slice(1),
        ]);
        only(aircraft, 'unknown-position', 'throttle');
      },
    );

    it('reports a phase entry value', () => {
      only(withEntry('parking', { master: 'half' }), 'unknown-position', 'master');
    });

    it('reports an action position', () => {
      const aircraft = withItems('beforeStart', [
        { type: 'action', control: 'master', position: 'half', text },
        ...beforeStartItems.slice(1),
      ]);
      only(aircraft, 'unknown-position', 'master');
    });

    it('reports a springBack key', () => {
      only(
        withControl('ignition', { springBack: { half: 'both' } }),
        'unknown-position',
        'ignition',
      );
    });

    it('reports a springBack value', () => {
      only(
        withControl('ignition', { springBack: { start: 'half' } }),
        'unknown-position',
        'ignition',
      );
    });

    it('reports an artwork image key', () => {
      const aircraft = withControl('master', {
        appearance: {
          artwork: {
            face: 'master-face.png',
            moving: { type: 'positions', images: { off: 'a.png', half: 'b.png' } },
          },
        },
      });
      only(aircraft, 'unknown-position', 'master');
    });
  });

  describe('invalid-check-response', () => {
    const check = (tolerance: number) =>
      withItems('beforeStart', [
        {
          type: 'check',
          target: { indicator: 'rpm' },
          condition: () => true,
          response: { reading: () => 0, tolerance },
          text,
        },
      ]);

    it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
      'reports the tolerance %s, naming procedure and item',
      (tolerance) => {
        const finding = only(check(tolerance), 'invalid-check-response', 'rpm');
        expect(finding.message).toContain('procedure beforeStart item 0');
      },
    );

    it.each([0, 50])('accepts the tolerance %s', (tolerance) => {
      expect(ofCode(check(tolerance), 'invalid-check-response')).toEqual([]);
    });
  });

  describe('invalid-flow', () => {
    const flowAction = { type: 'action', flow: true, control: 'master', position: 'on', text };

    it('accepts a flow of actions at the start of a normal procedure', () => {
      const aircraft = withItems('beforeStart', [
        flowAction,
        { ...flowAction, control: 'fuelPump' },
        ...beforeStartItems,
      ]);
      expect(validateAircraft(aircraft)).toEqual([]);
    });

    it('reports a flow on an emergency procedure', () => {
      const items = fixtureAircraft.procedures.alternatorFailure?.items ?? [];
      const finding = only(
        withItems('alternatorFailure', [flowAction, ...items]),
        'invalid-flow',
        'alternatorFailure',
      );
      expect(finding.message).toContain('procedure alternatorFailure item 0');
      expect(finding.message).toContain('normal');
    });

    it('reports a check in a flow', () => {
      const check = {
        type: 'check',
        flow: true,
        target: { indicator: 'rpm' },
        condition: () => true,
        text,
      };
      const finding = only(
        withItems('beforeStart', [flowAction, check, ...beforeStartItems]),
        'invalid-flow',
        'beforeStart',
      );
      expect(finding.message).toContain('procedure beforeStart item 1');
      expect(finding.message).toContain('action');
    });

    it('reports a flow item after a checklist item', () => {
      const finding = only(
        withItems('beforeStart', [...beforeStartItems, flowAction]),
        'invalid-flow',
        'beforeStart',
      );
      expect(finding.message).toContain(`procedure beforeStart item ${beforeStartItems.length}`);
      expect(finding.message).toContain('start');
    });
  });

  describe('inexact-lever-target', () => {
    const action = (control: string, position: unknown) =>
      withItems('beforeStart', [
        { type: 'action', control, position, text },
        ...beforeStartItems.slice(1),
      ]);

    it('reports an in-between target on a continuous lever, naming procedure and item', () => {
      const finding = only(action('throttle', 0.5), 'inexact-lever-target', 'throttle');
      expect(finding.message).toContain('procedure beforeStart item 0');
      expect(finding.message).toContain('check item');
      expect(finding.message).toContain('notches');
    });

    it.each([0, 1])('accepts the stop %s on a continuous lever', (value) => {
      expect(ofCode(action('throttle', value), 'inexact-lever-target')).toEqual([]);
    });

    it('does not affect a notched lever', () => {
      const aircraft = action('flaps', 'takeoff');
      expect(ofCode(aircraft, 'inexact-lever-target')).toEqual([]);
      expect(validateAircraft(aircraft)).toEqual([]);
    });

    it('reports an unknown position only, for a value outside the travel', () => {
      const aircraft = action('throttle', 1.5);
      expect(ofCode(aircraft, 'inexact-lever-target')).toEqual([]);
      only(aircraft, 'unknown-position', 'throttle');
    });

    it('ignores an in-between initial, phase entry and check target', () => {
      const aircraft = withEntry('parking', { throttle: 0.5 });
      expect(ofCode(withControl('throttle', { initial: 0.5 }), 'inexact-lever-target')).toEqual([]);
      expect(ofCode(aircraft, 'inexact-lever-target')).toEqual([]);
      const check = withItems('beforeStart', [
        { type: 'check', target: { control: 'throttle' }, condition: () => true, text },
      ]);
      expect(ofCode(check, 'inexact-lever-target')).toEqual([]);
    });
  });

  describe('artwork-glass-size', () => {
    const sizes: Record<string, { width: number; height: number }> = {
      'volts-face.png': { width: 200, height: 200 },
      'volts-glass.png': { width: 200, height: 200 },
      'master-face.png': { width: 60, height: 80 },
    };
    const imageSize = (url: string) => sizes[url];
    const glassFindings = (aircraft: Aircraft, context = { imageSize }) =>
      validateAircraft(aircraft, context).filter((f) => f.code === 'artwork-glass-size');

    it('accepts glass the size of its face', () => {
      expect(glassFindings(fixtureAircraft)).toEqual([]);
    });

    it('reports indicator glass of another size than its face', () => {
      const [finding, ...rest] = glassFindings(fixtureAircraft, {
        imageSize: (url) => (url === 'volts-glass.png' ? { width: 100, height: 200 } : sizes[url]),
      });
      expect(rest).toEqual([]);
      expect(finding).toMatchObject({ id: 'busVolts' });
      expect(finding?.message).toContain('100x200');
      expect(finding?.message).toContain('200x200');
    });

    it('reports control glass of another size than its face', () => {
      const aircraft = withControl('master', {
        appearance: {
          artwork: {
            face: 'master-face.png',
            glass: 'volts-glass.png',
            moving: { type: 'positions', images: { off: 'a.png', on: 'b.png' } },
          },
        },
      });
      expect(glassFindings(aircraft).map((f) => f.id)).toEqual(['master']);
    });

    it('skips the check for an image whose size the context cannot tell', () => {
      expect(glassFindings(fixtureAircraft, { imageSize: () => undefined })).toEqual([]);
      expect(
        glassFindings(fixtureAircraft, {
          imageSize: (url) => (url === 'volts-glass.png' ? undefined : sizes[url]),
        }),
      ).toEqual([]);
      expect(validateAircraft(fixtureAircraft)).toEqual([]);
    });
  });

  it('formats a finding with the aircraft, code and id', () => {
    const [finding] = validateAircraft(withPhase('parking', { image: '' }));
    const line = formatFinding(finding as Finding);
    expect(line).toContain('fixture');
    expect(line).toContain('phase-without-image');
    expect(line).toContain('parking');
  });
});

import { describe, expect, it } from 'vitest';
import { fixtureAircraft } from '../contract/fixtures';
import type { Aircraft } from '../contract';
import { engineMonitor, fixtureDeviceAircraft } from '../devices/fixtures';
import { validateAircraft } from './validate-aircraft';
import type { Finding } from './validate-aircraft';

const sized = (size: unknown, base: Aircraft = fixtureAircraft): Aircraft =>
  ({
    ...base,
    views: { ...base.views, panel: { ...base.views.panel, size } },
  }) as Aircraft;

const outside = (aircraft: Aircraft, context = {}): Finding[] =>
  validateAircraft(aircraft, context).filter((f) => f.code === 'placement-outside-view');

const invalid = (aircraft: Aircraft): Finding[] =>
  validateAircraft(aircraft).filter((f) => f.code === 'invalid-view-size');

describe('view size', () => {
  it('finds nothing when every placement lies inside the declared size', () => {
    expect(validateAircraft(sized({ width: 400, height: 200 }))).toEqual([]);
  });

  it('accepts a placement that touches the edge', () => {
    expect(validateAircraft(sized({ width: 250, height: 100 }))).toEqual([]);
  });

  it('reports a control past the right edge', () => {
    const [finding, ...rest] = outside(sized({ width: 249, height: 200 }));
    expect(rest).toEqual([]);
    expect(finding).toMatchObject({ id: 'alternatorBreaker' });
    expect(finding?.message).toContain('panel');
  });

  it('reports an indicator past the bottom edge', () => {
    expect(outside(sized({ width: 400, height: 99 })).map((f) => f.id)).toEqual([
      'busVolts',
      'rpm',
    ]);
  });

  it('reports a placement with a negative origin', () => {
    const aircraft = {
      ...fixtureAircraft,
      views: {
        ...fixtureAircraft.views,
        panel: {
          ...fixtureAircraft.views.panel,
          size: { width: 400, height: 200 },
          controls: { master: { rect: { x: -1, y: 10, w: 40, h: 40 } } },
        },
      },
    } as Aircraft;
    expect(outside(aircraft).map((f) => f.id)).toEqual(['master']);
  });

  it('reports a device install past the edge of its view', () => {
    const [finding, ...rest] = outside(sized({ width: 339, height: 200 }, fixtureDeviceAircraft), {
      devices: [engineMonitor],
    });
    expect(rest).toEqual([]);
    expect(finding).toMatchObject({ id: 'mon' });
  });

  it('does not check a view that declares no size', () => {
    expect(outside(fixtureAircraft)).toEqual([]);
  });

  it.each([
    ['zero width', { width: 0, height: 10 }],
    ['negative height', { width: 10, height: -1 }],
    ['infinite width', { width: Infinity, height: 10 }],
    ['NaN height', { width: 10, height: NaN }],
    ['a string', { width: '10', height: 10 }],
    ['a missing height', { width: 10 }],
    ['not an object', 'big'],
  ])('reports %s as an invalid size and checks no placement against it', (_, size) => {
    const aircraft = sized(size);
    const [finding, ...rest] = invalid(aircraft);
    expect(rest).toEqual([]);
    expect(finding).toMatchObject({ id: 'panel' });
    expect(outside(aircraft)).toEqual([]);
  });
});

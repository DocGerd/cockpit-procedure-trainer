import { describe, expect, it } from 'vitest';
import { fixtureAircraft } from '../contract/fixtures';
import type { Aircraft } from '../contract';
import { validateAircraft } from './validate-aircraft';
import type { Finding, FindingCode } from './validate-aircraft';

const cell = (x: number, y: number, w: number, h: number, minWidth = 300) => ({
  rect: { x, y, w, h },
  minWidth,
});

const arrangement = {
  size: { width: 400, height: 200 },
  views: { panel: cell(0, 0, 400, 100), console: cell(0, 100, 400, 100) },
};

const withCockpit = (cockpit: unknown): Aircraft => ({ ...fixtureAircraft, cockpit }) as Aircraft;

const cockpitFindings = (aircraft: Aircraft): Finding[] =>
  validateAircraft(aircraft).filter((finding) => finding.code.includes('cockpit'));

const codes = (aircraft: Aircraft): FindingCode[] =>
  cockpitFindings(aircraft).map((finding) => finding.code);

describe('cockpit arrangement', () => {
  it('finds nothing for a valid arrangement', () => {
    expect(validateAircraft(withCockpit(arrangement))).toEqual([]);
  });

  it('finds nothing for an aircraft without an arrangement', () => {
    const without = withCockpit(undefined);
    expect(validateAircraft(without)).toEqual([]);
    expect(cockpitFindings(without)).toEqual([]);
  });

  it('lets cells that touch at an edge sit side by side', () => {
    const touching = {
      size: { width: 400, height: 200 },
      views: { panel: cell(0, 0, 200, 200), console: cell(200, 0, 200, 200) },
    };
    expect(codes(withCockpit(touching))).toEqual([]);
  });

  it.each([
    ['zero width', { width: 0, height: 10 }],
    ['negative height', { width: 10, height: -1 }],
    ['infinite width', { width: Infinity, height: 10 }],
    ['NaN height', { width: 10, height: NaN }],
    ['a string', { width: '10', height: 10 }],
    ['a missing height', { width: 10 }],
    ['not an object', 'big'],
  ])('reports %s as an invalid size and checks no cell against it', (_, size) => {
    const aircraft = withCockpit({ ...arrangement, size });
    const [finding, ...rest] = cockpitFindings(aircraft);
    expect(rest).toEqual([]);
    expect(finding).toMatchObject({ code: 'invalid-cockpit-size', id: 'cockpit' });
  });

  it('reports a view without a cell', () => {
    const aircraft = withCockpit({ ...arrangement, views: { panel: arrangement.views.panel } });
    expect(cockpitFindings(aircraft)).toMatchObject([
      { code: 'missing-cockpit-view', id: 'console' },
    ]);
  });

  it('reports a cell that names no view', () => {
    const aircraft = withCockpit({
      size: { width: 400, height: 300 },
      views: { ...arrangement.views, glareshield: cell(0, 200, 400, 100) },
    });
    expect(cockpitFindings(aircraft)).toMatchObject([
      { code: 'unknown-cockpit-view', id: 'glareshield' },
    ]);
  });

  it.each([
    ['right', cell(100, 0, 301, 100)],
    ['bottom', cell(0, 101, 400, 100)],
    ['left', cell(-1, 0, 100, 100)],
    ['top', cell(0, -1, 100, 100)],
  ])('reports a cell that leaves the arrangement past the %s edge', (_, outside) => {
    const aircraft = withCockpit({
      ...arrangement,
      views: { panel: outside, console: cell(0, 150, 10, 10) },
    });
    expect(
      cockpitFindings(aircraft).filter(({ code }) => code === 'cockpit-cell-outside'),
    ).toMatchObject([{ id: 'panel' }]);
  });

  it('reports two cells that overlap, naming both views', () => {
    const aircraft = withCockpit({
      ...arrangement,
      views: { panel: cell(0, 0, 400, 101), console: cell(0, 100, 400, 100) },
    });
    const [finding, ...rest] = cockpitFindings(aircraft);
    expect(rest).toEqual([]);
    expect(finding).toMatchObject({ code: 'cockpit-cells-overlap' });
    expect(finding?.message).toContain('panel');
    expect(finding?.message).toContain('console');
  });

  it.each([
    ['zero', 0],
    ['negative', -5],
    ['infinite', Infinity],
    ['NaN', NaN],
    ['a string', '300'],
  ])('reports a %s minWidth', (_, minWidth) => {
    const aircraft = withCockpit({
      ...arrangement,
      views: { ...arrangement.views, panel: { ...arrangement.views.panel, minWidth } },
    });
    expect(cockpitFindings(aircraft)).toMatchObject([
      { code: 'invalid-cockpit-min-width', id: 'panel' },
    ]);
  });

  it.each([
    ['a missing rect', { minWidth: 300 }],
    ['a null rect', { rect: null, minWidth: 300 }],
    ['a zero width', cell(0, 0, 0, 100)],
    ['a negative height', cell(0, 0, 400, -100)],
    ['an infinite width', cell(0, 0, Infinity, 100)],
    ['a NaN height', cell(0, 0, 400, NaN)],
    ['a string width', { rect: { x: 0, y: 0, w: '400', h: 100 }, minWidth: 300 }],
    ['a NaN origin', cell(NaN, 0, 400, 100)],
  ])('reports %s as exactly one invalid cell rect', (_, broken) => {
    const aircraft = withCockpit({
      ...arrangement,
      views: { panel: broken, console: cell(0, 100, 400, 100) },
    });
    expect(cockpitFindings(aircraft)).toMatchObject([
      { code: 'invalid-cockpit-cell-rect', id: 'panel' },
    ]);
  });

  it('does not throw on a malformed cell', () => {
    const aircraft = withCockpit({ ...arrangement, views: { panel: null, console: {} } });
    expect(() => validateAircraft(aircraft)).not.toThrow();
    expect(codes(aircraft)).toContain('invalid-cockpit-min-width');
  });
});

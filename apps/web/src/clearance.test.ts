import { describe, expect, it } from 'vitest';
import { clearanceProblems } from '../e2e/legibility';
import type { Box, Shape } from '../e2e/legibility';

const where = 'view/control';
const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

const rotation = (degrees: number, about: { x: number; y: number }) => {
  const sin = Math.sin((degrees * Math.PI) / 180);
  const cos = Math.cos((degrees * Math.PI) / 180);
  return {
    a: cos,
    b: sin,
    c: -sin,
    d: cos,
    e: about.x - cos * about.x + sin * about.y,
    f: about.y - sin * about.x - cos * about.y,
  };
};

const label = (left: number, top: number, right: number, bottom: number): Box => ({
  left,
  top,
  right,
  bottom,
});

// A thin bar from (0,0) to (100,0), turned about its start so it runs to the lower right.
const diagonalBar: Shape = {
  tag: 'rect',
  box: { x: 0, y: -2, width: 100, height: 4 },
  matrix: rotation(45, { x: 0, y: 0 }),
};

const disc: Shape = {
  tag: 'circle',
  box: { x: -20, y: -20, width: 40, height: 40 },
  matrix: { ...identity, e: 50, f: 50 },
};

describe('clearance of the placard from the moving parts', () => {
  it('passes a label that sits in the empty corner of a turned bar box', () => {
    // The bar's screen box spans 0..71 both ways, but the bar itself never reaches (60, 10).
    expect(clearanceProblems(where, label(55, 5, 70, 20), [diagonalBar], [])).toEqual([]);
  });

  it('fails a label the turned bar crosses', () => {
    expect(clearanceProblems(where, label(30, 20, 45, 35), [diagonalBar], [])).toEqual([
      `${where} placard overlaps a moving part`,
    ]);
  });

  it('passes a label in the corner of a round part box that the round part does not reach', () => {
    // The disc spans 30..70 both ways; the label sits by its box corner, clear of the rim.
    expect(clearanceProblems(where, label(65, 25, 80, 36), [disc], [])).toEqual([]);
  });

  it('fails a label that reaches into a round part', () => {
    expect(clearanceProblems(where, label(60, 40, 90, 60), [disc], [])).toEqual([
      `${where} placard overlaps a moving part`,
    ]);
  });

  it('allows the label to touch a part within the clearance', () => {
    expect(clearanceProblems(where, label(69.5, 40, 90, 60), [disc], [])).toEqual([]);
  });

  it('measures a circle under a scaling and turning matrix by its radius', () => {
    const turn = rotation(30, { x: 0, y: 0 });
    const scaled: Shape = {
      ...disc,
      matrix: { a: 2 * turn.a, b: 2 * turn.b, c: 2 * turn.c, d: 2 * turn.d, e: 50, f: 50 },
    };
    expect(clearanceProblems(where, label(95, 40, 120, 60), [scaled], [])).toEqual([]);
  });

  it('fails when a control has no moving part', () => {
    expect(clearanceProblems(where, label(0, 0, 10, 10), [], [])).toEqual([
      `${where} has no measurable moving part`,
    ]);
  });

  it('fails on a moving part it cannot measure', () => {
    expect(clearanceProblems(where, label(0, 0, 10, 10), [disc], ['text'])).toEqual([
      `${where} moving part <text> cannot be measured`,
    ]);
  });

  it('checks every part, not only the first', () => {
    expect(clearanceProblems(where, label(60, 40, 90, 60), [diagonalBar, disc], [])).toEqual([
      `${where} placard overlaps a moving part`,
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import { clearanceProblems } from '../e2e/clearance';
import type { Box, Shape } from '../e2e/clearance';

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

  describe('non-similar circle', () => {
    // r 10 under a 4x stretch across: an ellipse 80 wide and 20 tall around (50, 50).
    const stretched: Shape = {
      tag: 'circle',
      box: { x: -10, y: -10, width: 20, height: 20 },
      matrix: { a: 4, b: 0, c: 0, d: 1, e: 50, f: 50 },
    };

    it('fails a label that reaches into it', () => {
      expect(clearanceProblems(where, label(85, 40, 120, 60), [stretched], [])).toEqual([
        `${where} placard overlaps a moving part`,
      ]);
    });

    it('passes a label beyond its long end', () => {
      expect(clearanceProblems(where, label(95, 40, 120, 60), [stretched], [])).toEqual([]);
    });

    it('passes a label in the corner of its box that it does not reach', () => {
      expect(clearanceProblems(where, label(85, 55, 100, 70), [stretched], [])).toEqual([]);
    });

    it('keeps the ellipse at its mirrored place', () => {
      const mirrored: Shape = {
        tag: 'circle',
        box: { x: -5, y: -10, width: 20, height: 20 },
        matrix: { a: -4, b: 0, c: 0, d: 1, e: 50, f: 50 },
      };
      expect(clearanceProblems(where, label(60, 40, 90, 60), [mirrored], [])).toEqual([
        `${where} placard overlaps a moving part`,
      ]);
      expect(clearanceProblems(where, label(75, 40, 100, 60), [mirrored], [])).toEqual([]);
    });

    it('measures an ellipse element by its own radii', () => {
      const ellipse: Shape = {
        tag: 'ellipse',
        box: { x: -40, y: -10, width: 80, height: 20 },
        matrix: { ...identity, e: 50, f: 50 },
      };
      expect(clearanceProblems(where, label(85, 55, 100, 70), [ellipse], [])).toEqual([]);
      expect(clearanceProblems(where, label(85, 40, 120, 60), [ellipse], [])).toEqual([
        `${where} placard overlaps a moving part`,
      ]);
    });
  });

  describe('circle under skew', () => {
    // Screen x gains the local y: the disc leans toward the lower right.
    const leaning: Shape = {
      tag: 'circle',
      box: { x: -10, y: -10, width: 20, height: 20 },
      matrix: { a: 1, b: 0, c: 1, d: 1, e: 50, f: 50 },
    };

    it('passes a label in the empty upper right of its box', () => {
      expect(clearanceProblems(where, label(59, 30, 80, 45), [leaning], [])).toEqual([]);
    });

    it('fails a label over its middle', () => {
      expect(clearanceProblems(where, label(54, 40, 80, 60), [leaning], [])).toEqual([
        `${where} placard overlaps a moving part`,
      ]);
    });
  });

  describe('flat line', () => {
    const line: Shape = {
      tag: 'line',
      box: { x: 10, y: 0, width: 30, height: 0 },
      matrix: { ...identity, e: 50, f: 50 },
    };

    it('fails a label it runs through', () => {
      expect(clearanceProblems(where, label(70, 40, 100, 60), [line], [])).toEqual([
        `${where} placard overlaps a moving part`,
      ]);
    });

    it('passes a label clear of it', () => {
      expect(clearanceProblems(where, label(70, 52, 100, 70), [line], [])).toEqual([]);
    });
  });

  describe('rect', () => {
    const upright: Shape = {
      tag: 'rect',
      box: { x: 0, y: 0, width: 20, height: 20 },
      matrix: { ...identity, e: 50, f: 50 },
    };

    it('passes a label exactly the clearance into it', () => {
      expect(clearanceProblems(where, label(69, 50, 120, 60), [upright], [])).toEqual([]);
    });

    it('fails a label beyond the clearance into it', () => {
      expect(clearanceProblems(where, label(68.5, 50, 120, 60), [upright], [])).toEqual([
        `${where} placard overlaps a moving part`,
      ]);
    });

    it('is measured at its mirrored place', () => {
      const mirrored: Shape = { ...upright, matrix: { a: -1, b: 0, c: 0, d: 1, e: 100, f: 0 } };
      expect(clearanceProblems(where, label(70, 0, 81, 20), [mirrored], [])).toEqual([]);
      expect(clearanceProblems(where, label(70, 0, 83, 20), [mirrored], [])).toEqual([
        `${where} placard overlaps a moving part`,
      ]);
    });

    it('is measured as a parallelogram under skew', () => {
      const sheared: Shape = {
        tag: 'rect',
        box: { x: 0, y: 0, width: 40, height: 10 },
        matrix: { a: 1, b: 0, c: 1, d: 1, e: 0, f: 0 },
      };
      expect(clearanceProblems(where, label(-5, 4, 5, 20), [sheared], [])).toEqual([]);
      expect(clearanceProblems(where, label(5, 4, 20, 20), [sheared], [])).toEqual([
        `${where} placard overlaps a moving part`,
      ]);
    });
  });
});

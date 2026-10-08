import type { MovingPart } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { fractionNear, layerFraction, needleAngle, pointAlong, readHitAreas } from './geometry';

type Needle = Extract<MovingPart, { type: 'needle' }>;

const needle: Needle = {
  type: 'needle',
  image: 'needle.png',
  pivot: { x: 20, y: 20 },
  angleRange: { min: -60, max: 120 },
  valueRange: { min: 10, max: 20 },
};

describe('needleAngle', () => {
  it('maps the value range linearly onto the angle range', () => {
    expect(needleAngle(needle, 10)).toBe(-60);
    expect(needleAngle(needle, 15)).toBe(30);
    expect(needleAngle(needle, 20)).toBe(120);
    expect(needleAngle(needle, 12.5)).toBeCloseTo(-15);
  });

  it('clamps outside the value range', () => {
    expect(needleAngle(needle, 0)).toBe(-60);
    expect(needleAngle(needle, 99)).toBe(120);
    expect(needleAngle(needle, Number.POSITIVE_INFINITY)).toBe(120);
  });

  it('rests at the minimum angle for a value that is not a number or a range without width', () => {
    expect(needleAngle(needle, Number.NaN)).toBe(-60);
    expect(needleAngle({ ...needle, valueRange: { min: 5, max: 5 } }, 5)).toBe(-60);
  });
});

describe('layerFraction', () => {
  it('passes numbers, maps booleans, and places a named notch by its index', () => {
    expect(layerFraction(0.4)).toBe(0.4);
    expect(layerFraction(true)).toBe(1);
    expect(layerFraction(false)).toBe(0);
    expect(layerFraction('b', ['a', 'b', 'c'])).toBe(0.5);
    expect(layerFraction('c', ['a', 'b', 'c'])).toBe(1);
  });

  it('is not a number for a string without a notch', () => {
    expect(layerFraction('x')).toBeNaN();
    expect(layerFraction('x', ['a', 'b'])).toBeNaN();
    expect(layerFraction('a', ['a'])).toBeNaN();
  });
});

describe('pointAlong', () => {
  const bent = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 30 },
  ];

  it('is the first point at 0 and the last at 1', () => {
    expect(pointAlong(bent, 0)).toEqual({ x: 0, y: 0 });
    expect(pointAlong(bent, 1)).toEqual({ x: 10, y: 30 });
  });

  it('is linear in path length, not in the number of points', () => {
    expect(pointAlong(bent, 0.25)).toEqual({ x: 10, y: 0 });
    expect(pointAlong(bent, 0.5)).toEqual({ x: 10, y: 10 });
    expect(pointAlong(bent, 0.125)).toEqual({ x: 5, y: 0 });
  });

  it('clamps outside 0 to 1 and handles degenerate paths', () => {
    expect(pointAlong(bent, -1)).toEqual({ x: 0, y: 0 });
    expect(pointAlong(bent, 2)).toEqual({ x: 10, y: 30 });
    expect(pointAlong(bent, Number.NaN)).toEqual({ x: 0, y: 0 });
    expect(pointAlong([{ x: 3, y: 4 }], 0.5)).toEqual({ x: 3, y: 4 });
    expect(pointAlong([], 0.5)).toEqual({ x: 0, y: 0 });
  });
});

describe('fractionNear', () => {
  const bent = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 30 },
  ];

  it('projects a point onto the nearest part of the path', () => {
    expect(fractionNear(bent, { x: 5, y: 4 })).toBeCloseTo(0.125);
    expect(fractionNear(bent, { x: 14, y: 10 })).toBeCloseTo(0.5);
  });

  it('lands exactly on the stops when dragged past them', () => {
    expect(fractionNear(bent, { x: -50, y: -50 })).toBe(0);
    expect(fractionNear(bent, { x: 10, y: 500 })).toBe(1);
  });

  it('is 0 for a path without length', () => {
    expect(fractionNear([{ x: 1, y: 1 }], { x: 5, y: 5 })).toBe(0);
  });
});

describe('readHitAreas', () => {
  const top = { left: 0, top: 0, width: 1, height: 0.5 };

  it('reads a box per position, and none when the option is absent', () => {
    expect(readHitAreas({ hitArea: { open: top } })).toEqual({ open: top });
    expect(readHitAreas(undefined)).toEqual({});
    expect(readHitAreas({ needleShadow: true })).toEqual({});
  });

  it.each([
    ['not an object', { hitArea: [top] }],
    ['a box that is not an object', { hitArea: { open: 1 } }],
    ['a missing side', { hitArea: { open: { left: 0, top: 0, width: 1 } } }],
    ['a box past the face', { hitArea: { open: { ...top, top: 0.6 } } }],
    ['an empty box', { hitArea: { open: { ...top, width: 0 } } }],
    ['a negative offset', { hitArea: { open: { ...top, left: -0.1 } } }],
  ])('refuses %s', (_, options) => {
    expect(readHitAreas(options)).toBeNull();
  });
});

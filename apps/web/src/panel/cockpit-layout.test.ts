import type { Aircraft } from '@cpt/core';
import { describe, expect, it } from 'vitest';
import { chooseLayout } from './cockpit-layout';

const text = { de: 'x', en: 'x' };

// Two views side by side in a 400 x 100 arrangement; both cells match their view's aspect.
const aircraft = {
  views: {
    left: { name: text, image: 'left.png', size: { width: 200, height: 100 } },
    right: { name: text, image: 'right.png', size: { width: 100, height: 100 } },
  },
  cockpit: {
    size: { width: 400, height: 100 },
    views: {
      right: { rect: { x: 200, y: 0, w: 200, h: 100 }, minWidth: 100 },
      left: { rect: { x: 0, y: 0, w: 200, h: 100 }, minWidth: 200 },
    },
  },
} as unknown as Pick<Aircraft, 'cockpit' | 'views'>;

describe('chooseLayout', () => {
  it('is combined when every view reaches its floor', () => {
    expect(chooseLayout(aircraft, { width: 400, height: 100 }).kind).toBe('combined');
  });

  it('is tabs when one view is one CSS px short of its floor', () => {
    expect(chooseLayout(aircraft, { width: 399, height: 100 }).kind).toBe('tabs');
    expect(chooseLayout(aircraft, { width: 400, height: 99 }).kind).toBe('tabs');
  });

  it('is tabs for an aircraft without an arrangement', () => {
    expect(chooseLayout({ views: aircraft.views }, { width: 4000, height: 4000 })).toEqual({
      kind: 'tabs',
    });
  });

  it('is tabs for a region without size', () => {
    expect(chooseLayout(aircraft, { width: 0, height: 0 }).kind).toBe('tabs');
    expect(chooseLayout(aircraft, { width: 1000, height: 0 }).kind).toBe('tabs');
    expect(chooseLayout(aircraft, { width: Number.NaN, height: 1000 }).kind).toBe('tabs');
  });

  it('scales the arrangement uniformly into the region and places the cells in its order', () => {
    const layout = chooseLayout(aircraft, { width: 1000, height: 500 });
    expect(layout).toEqual({
      kind: 'combined',
      scale: 2.5,
      width: 1000,
      height: 250,
      cells: [
        { viewId: 'right', left: 500, top: 0, width: 500, height: 250, fitWidth: 250 },
        { viewId: 'left', left: 0, top: 0, width: 500, height: 250, fitWidth: 500 },
      ],
    });
  });

  it('contain-fits a view whose aspect is taller than its cell', () => {
    const layout = chooseLayout(aircraft, { width: 800, height: 200 });
    expect(layout.kind === 'combined' && layout.cells.map((cell) => cell.fitWidth)).toEqual([
      200, 400,
    ]);
  });

  it('judges the height too: a short region lowers the scale', () => {
    expect(chooseLayout(aircraft, { width: 4000, height: 150 })).toMatchObject({ scale: 1.5 });
  });
});

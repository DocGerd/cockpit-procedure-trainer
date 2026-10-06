import { describe, expect, it } from 'vitest';
import { MAX_SCALE, MIN_SCALE, NO_ZOOM, clampZoom, panned, pinchSample, pinched } from './zoom';
import type { ZoomState } from './zoom';

const viewport = { width: 400, height: 200 };

describe('clampZoom', () => {
  it('bounds the scale', () => {
    expect(clampZoom({ scale: 9, offset: { x: 0, y: 0 } }, viewport).scale).toBe(MAX_SCALE);
    expect(clampZoom({ scale: 0.2, offset: { x: 0, y: 0 } }, viewport).scale).toBe(MIN_SCALE);
  });

  it('keeps the content covering the viewport', () => {
    const zoom = clampZoom({ scale: 2, offset: { x: 50, y: -999 } }, viewport);
    expect(zoom.offset).toEqual({ x: 0, y: -200 });
  });

  it('leaves no room to pan at scale 1', () => {
    expect(clampZoom({ scale: 1, offset: { x: -30, y: 40 } }, viewport)).toEqual(NO_ZOOM);
  });
});

describe('pinched', () => {
  const start: ZoomState = { scale: 2, offset: { x: -100, y: -40 } };

  it('keeps the content point under the fingers where it was', () => {
    const from = pinchSample({ x: 150, y: 80 }, { x: 250, y: 80 });
    const to = pinchSample({ x: 150, y: 80 }, { x: 350, y: 80 });
    const next = pinched(start, from, to, viewport);
    const content = (zoom: ZoomState, at: { x: number; y: number }) => ({
      x: (at.x - zoom.offset.x) / zoom.scale,
      y: (at.y - zoom.offset.y) / zoom.scale,
    });
    expect(next.scale).toBe(4);
    expect(content(next, to.center)).toEqual(content(start, from.center));
  });

  it('keeps the point under the fingers while the scale is held at the maximum', () => {
    const from = pinchSample({ x: 150, y: 100 }, { x: 250, y: 100 });
    const to = pinchSample({ x: 100, y: 100 }, { x: 300, y: 100 });
    const next = pinched(NO_ZOOM, from, { ...to, distance: from.distance * 10 }, viewport);
    expect(next.scale).toBe(MAX_SCALE);
    expect((to.center.x - next.offset.x) / next.scale).toBe(from.center.x);
  });

  it('scales by the ratio of the finger distances', () => {
    const from = pinchSample({ x: 100, y: 100 }, { x: 200, y: 100 });
    const next = pinched(
      NO_ZOOM,
      from,
      pinchSample({ x: 100, y: 100 }, { x: 250, y: 100 }),
      viewport,
    );
    expect(next.scale).toBe(1.5);
  });

  it('ignores a gesture that started with both fingers in one place', () => {
    const from = pinchSample({ x: 10, y: 10 }, { x: 10, y: 10 });
    expect(pinched(start, from, pinchSample({ x: 0, y: 0 }, { x: 90, y: 0 }), viewport)).toBe(
      start,
    );
  });
});

describe('panned', () => {
  it('moves with the finger and stops at the panel edge', () => {
    const start: ZoomState = { scale: 2, offset: { x: -100, y: -50 } };
    expect(panned(start, { x: -30, y: 20 }, viewport).offset).toEqual({ x: -130, y: -30 });
    expect(panned(start, { x: 500, y: -500 }, viewport).offset).toEqual({ x: 0, y: -200 });
    expect(panned(start, { x: -500, y: 500 }, viewport).offset).toEqual({ x: -400, y: 0 });
  });
});

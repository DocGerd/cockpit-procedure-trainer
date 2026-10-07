import { describe, expect, it } from 'vitest';
import { paintMs, range } from '../apps/web/e2e/perf/trace';
import type { TraceEvent } from '../apps/web/e2e/perf/trace';

const event = (name: string, ts: number, dur: number, tid = 1): TraceEvent => ({
  ph: 'X',
  name,
  ts,
  dur,
  pid: 1,
  tid,
});

describe('paintMs', () => {
  it('counts a PaintImage nested in a Paint once', () => {
    expect(paintMs([event('Paint', 0, 10_000), event('PaintImage', 1_000, 4_000)])).toBe(10);
  });

  it('counts a nested event once whichever order the trace lists it in', () => {
    expect(paintMs([event('PaintImage', 1_000, 4_000), event('Paint', 0, 10_000)])).toBe(10);
  });

  it('counts the outer event once when both start together, whichever is listed first', () => {
    expect(paintMs([event('PaintImage', 0, 4_000), event('Paint', 0, 10_000)])).toBe(10);
    expect(paintMs([event('Paint', 0, 10_000), event('PaintImage', 0, 4_000)])).toBe(10);
  });

  it('does not let an event on one thread shadow an overlapping one on another', () => {
    const onTwoThreads = [event('Paint', 0, 10_000, 1), event('PaintImage', 1_000, 4_000, 2)];
    expect(paintMs(onTwoThreads)).toBe(14);
    const onTwoProcesses = [event('Paint', 0, 10_000), { ...event('Paint', 1_000, 4_000), pid: 2 }];
    expect(paintMs(onTwoProcesses)).toBe(14);
  });

  it('counts a decode inside a raster task as part of the raster task', () => {
    expect(paintMs([event('RasterTask', 0, 6_000), event('Decode Image', 1_000, 2_000)])).toBe(6);
  });

  it('sums events that follow one another and events on other threads', () => {
    const events = [
      event('Paint', 0, 2_000),
      event('Paint', 2_000, 3_000),
      event('RasterTask', 500, 4_000, 2),
    ];
    expect(paintMs(events)).toBe(9);
  });

  it('ignores other events and incomplete ones', () => {
    const events = [event('Layout', 0, 5_000), { ...event('Paint', 0, 5_000), ph: 'B' }];
    expect(paintMs(events)).toBe(0);
  });
});

describe('range', () => {
  it('is the smallest and largest value', () => {
    expect(range([3, 1, 2])).toEqual({ min: 1, max: 3 });
  });
});

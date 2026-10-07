/**
 * The trace events whose duration is a sample's paint and raster cost. `PaintImage` always lies
 * inside a `Paint`, so only outermost events are summed.
 */
const PAINT_EVENTS = new Set([
  'Paint',
  'RasterTask',
  'Decode Image',
  'ImageDecodeTask',
  'PaintImage',
]);

export type TraceEvent = {
  ph?: string;
  name?: string;
  dur?: number;
  ts?: number;
  pid?: number;
  tid?: number;
};

export const range = (values: readonly number[]) => ({
  min: Math.min(...values),
  max: Math.max(...values),
});

/** Milliseconds of paint and raster in a trace, each stretch of time counted once per thread. */
export function paintMs(events: readonly TraceEvent[]): number {
  const threads = new Map<string, TraceEvent[]>();
  for (const event of events) {
    if (event.ph !== 'X' || !PAINT_EVENTS.has(event.name ?? '')) continue;
    const key = `${event.pid}:${event.tid}`;
    const thread = threads.get(key);
    if (thread) thread.push(event);
    else threads.set(key, [event]);
  }
  let micros = 0;
  for (const thread of threads.values()) {
    thread.sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0) || (b.dur ?? 0) - (a.dur ?? 0));
    let outerEnd = -Infinity;
    for (const { ts = 0, dur = 0 } of thread) {
      if (ts >= outerEnd) {
        micros += dur;
        outerEnd = ts + dur;
      }
    }
  }
  return micros / 1000;
}

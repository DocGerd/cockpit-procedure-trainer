import { useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export type Metrics = { scale: number; minPx: number };

export type ViewBox = { width: number; height: number };

export const FALLBACK_MIN_PX = 11;

export const SANS_ADVANCE = 0.65;
export const MONO_ADVANCE = 0.6;
export const CAPS_ADVANCE = 0.68;

export const MAX_SQUEEZE = 0.8;

export function scaleOf(box: ViewBox, viewBox: ViewBox): number | undefined {
  if (box.width <= 0 || box.height <= 0) return undefined;
  return Math.min(box.width / viewBox.width, box.height / viewBox.height);
}

export function readMinPx(): number {
  const value = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--text-2xs'),
  );
  return Number.isFinite(value) && value > 0 ? value : FALLBACK_MIN_PX;
}

export function fitDesign(max: number, room: number, chars: number, advance: number): number {
  return chars === 0 ? max : Math.min(max, room / (chars * advance));
}

export type Placement = { show: boolean; fontSize: number };

export type PlaceOptions = {
  design: number;
  room: number;
  chars: number;
  advance?: number;
  height?: number;
  squeezable?: boolean;
};

/** Never below the minimum text size: grow to it, and drop the text when it then does not fit. */
export function placeText(
  metrics: Metrics | undefined,
  {
    design,
    room,
    chars,
    advance = SANS_ADVANCE,
    height = Infinity,
    squeezable = false,
  }: PlaceOptions,
): Placement {
  if (metrics === undefined) return { show: true, fontSize: design };
  const fontSize = Math.max(design, metrics.minPx / metrics.scale);
  const width = chars * advance * fontSize;
  const wide = squeezable ? room / MAX_SQUEEZE : room;
  return { show: width <= wide && fontSize <= height, fontSize };
}

export const LEGEND_DESIGN = 12;
export const EDGE = 2;

export const placard = (id: string) => id.toUpperCase();

export type LegendEntry = { text: string; room: number };

export function placeLegends(
  metrics: Metrics | undefined,
  entries: readonly LegendEntry[],
  height = Infinity,
): Placement {
  const design = Math.min(
    LEGEND_DESIGN,
    ...entries.map(({ text, room }) => fitDesign(LEGEND_DESIGN, room, text.length, CAPS_ADVANCE)),
  );
  const { fontSize, show } = placeText(metrics, { design, room: Infinity, chars: 0, height });
  const fits = entries.every(({ text, room }) => text.length * CAPS_ADVANCE * fontSize <= room);
  return { show: show && (metrics === undefined || fits), fontSize };
}

export type TitlePlacement = Placement & { length: number | undefined };

export function placeTitle(
  metrics: Metrics | undefined,
  text: string,
  room: number,
  height = Infinity,
): TitlePlacement {
  const chars = text.length;
  const placed = placeText(metrics, {
    design: fitDesign(LEGEND_DESIGN, room, chars, CAPS_ADVANCE),
    room,
    chars,
    advance: CAPS_ADVANCE,
    height,
    squeezable: true,
  });
  const natural = chars * CAPS_ADVANCE * placed.fontSize;
  return { ...placed, length: natural > room ? room : undefined };
}

const same = (a: Metrics | undefined, b: Metrics | undefined) =>
  a === b || (a !== undefined && b !== undefined && a.scale === b.scale && a.minPx === b.minPx);

export function useRenderedMetrics(
  viewBox: ViewBox,
): [RefObject<SVGSVGElement | null>, Metrics | undefined] {
  const ref = useRef<SVGSVGElement>(null);
  const measure = useRef<() => void>(() => {});
  const [metrics, setMetrics] = useState<Metrics | undefined>(undefined);
  const { width, height } = viewBox;

  useLayoutEffect(() => {
    measure.current = () => {
      const element = ref.current;
      if (element === null) return;
      const scale = scaleOf(element.getBoundingClientRect(), { width, height });
      const next = scale === undefined ? undefined : { scale, minPx: readMinPx() };
      setMetrics((previous) => (same(previous, next) ? previous : next));
    };
    measure.current();
  });

  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => measure.current());
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, metrics];
}

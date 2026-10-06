// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- a script declaration file cannot be imported
/// <reference path="../artwork/css.d.ts" />
import type { ComponentProps, CSSProperties, KeyboardEvent, ReactNode } from 'react';
import type { Box } from './geometry';
import type { Size } from './legibility';
import {
  CAPS_ADVANCE,
  EDGE,
  FALLBACK_MIN_PX,
  placeTitle,
  placard as capitals,
  readMinPx,
  useBoxSize,
  useRenderedMetrics,
} from './legibility';
import type { Metrics } from './legibility';
import './controls.css';

export const TARGET = 'var(--size-target)';

export const vars = (values: Record<string, number>) => values as CSSProperties;

export function hitStyle(box: Box): CSSProperties {
  return {
    left: `${box.x}%`,
    top: `${box.y}%`,
    width: `${box.w}%`,
    height: `${box.h}%`,
    minWidth: TARGET,
    minHeight: TARGET,
    ...vars({ '--pk-hit-y': box.y, '--pk-hit-h': box.h }),
  };
}

type StageProps = {
  width: number;
  height: number;
  art: ReactNode | ((metrics: Metrics | undefined) => ReactNode);
  placard?: string | undefined;
  children?: ReactNode;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
};

export const PLACARD_BAND = 26;
const PLATE_PAD = 4;

function Placard({
  text,
  width,
  band,
  metrics,
}: {
  text: string;
  width: number;
  band: number;
  metrics: Metrics | undefined;
}) {
  const room = width - 2 * (EDGE + PLATE_PAD);
  const title = placeTitle(metrics, text, room, band - 2 * EDGE);
  const natural = text.length * CAPS_ADVANCE * title.fontSize;
  const length = natural > room ? room : undefined;
  const textWidth = length ?? natural;
  const plate = textWidth + 2 * PLATE_PAD;
  return (
    <>
      <rect
        x={(width - plate) / 2}
        y={-band + EDGE}
        width={plate}
        height={band - 2 * EDGE}
        rx={3}
        className="pk-placard-plate"
      />
      <text
        x={width / 2}
        y={-band / 2}
        className="pk-placard"
        data-placard=""
        {...(title.show ? {} : { 'data-overfull': '' })}
        style={vars({ '--pk-font': title.fontSize })}
        {...(length === undefined ? {} : { textLength: length, lengthAdjust: 'spacingAndGlyphs' })}
      >
        {text}
      </text>
    </>
  );
}

/** Tall enough for the placard at the minimum text size in the space the widget is given. */
export function placardBand(
  room: Size | undefined,
  minPx: number,
  width: number,
  height: number,
): number {
  if (room === undefined) return PLACARD_BAND;
  const byWidth = (minPx * width) / room.width + 2 * EDGE;
  const byHeight =
    room.height > minPx
      ? ((minPx * height) / room.height + 2 * EDGE) / (1 - minPx / room.height)
      : Infinity;
  const band = Math.ceil(Math.max(PLACARD_BAND, byWidth, byHeight));
  return Number.isFinite(band) ? Math.min(band, height) : PLACARD_BAND;
}

export function Stage({ width, height, art, placard, children, onKeyDown }: StageProps) {
  const text = placard ? capitals(placard) : '';
  const [rootRef, room] = useBoxSize(text !== '');
  const band = text ? placardBand(room, room ? readMinPx() : FALLBACK_MIN_PX, width, height) : 0;
  const total = height + band;
  const [svgRef, metrics] = useRenderedMetrics({ width, height: total });
  return (
    <div ref={rootRef} className="pk-root" style={{ minWidth: TARGET, minHeight: TARGET }}>
      <div
        className="pk-stage"
        style={vars({ '--pk-ratio': width / total })}
        {...(onKeyDown ? { onKeyDown } : {})}
      >
        <svg
          ref={svgRef}
          className="pk-svg"
          viewBox={`0 ${-band} ${width} ${total}`}
          aria-hidden="true"
          focusable="false"
        >
          {text && <Placard text={text} width={width} band={band} metrics={metrics} />}
          {typeof art === 'function' ? art(metrics) : art}
        </svg>
        <div
          className="pk-body"
          {...(band > 0 ? { 'data-band': '' } : {})}
          style={{ top: `${(band / total) * 100}%`, height: `${(height / total) * 100}%` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function Fill(props: ComponentProps<'div'>) {
  return <div className="pk-fill" {...props} />;
}

export function CurrentState({ id, text }: { id: string; text: string }) {
  return (
    <span id={id} className="pk-sr">
      {text}
    </span>
  );
}

export type Anchor = 'start' | 'middle' | 'end';

export function Legend({
  x,
  y,
  text,
  current,
  font,
  anchor = 'start',
  turn,
  length,
}: {
  x: number;
  y: number;
  text: string;
  current: boolean;
  font: number;
  anchor?: Anchor;
  turn?: number;
  length?: number | undefined;
}) {
  return (
    <text
      x={x}
      y={y}
      className="pk-legend"
      style={vars({ '--pk-font': font })}
      data-current={current}
      data-anchor={anchor}
      {...(length === undefined ? {} : { textLength: length, lengthAdjust: 'spacingAndGlyphs' })}
      {...(turn === undefined ? {} : { transform: `rotate(${turn} ${x} ${y})` })}
    >
      {text}
    </text>
  );
}

// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- a script declaration file cannot be imported
/// <reference path="../artwork/css.d.ts" />
import type { ComponentProps, CSSProperties, KeyboardEvent, ReactNode } from 'react';
import type { Box } from './geometry';
import { useRenderedMetrics } from './legibility';
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
  };
}

type StageProps = {
  width: number;
  height: number;
  art: ReactNode | ((metrics: Metrics | undefined) => ReactNode);
  children?: ReactNode;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
};

export function Stage({ width, height, art, children, onKeyDown }: StageProps) {
  const [svgRef, metrics] = useRenderedMetrics({ width, height });
  return (
    <div className="pk-root" style={{ minWidth: TARGET, minHeight: TARGET }}>
      <div
        className="pk-stage"
        style={vars({ '--pk-ratio': width / height })}
        {...(onKeyDown ? { onKeyDown } : {})}
      >
        <svg
          ref={svgRef}
          className="pk-svg"
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
          focusable="false"
        >
          {typeof art === 'function' ? art(metrics) : art}
        </svg>
        {children}
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

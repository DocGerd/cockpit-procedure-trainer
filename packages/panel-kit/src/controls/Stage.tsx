// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- a script declaration file cannot be imported
/// <reference path="../artwork/css.d.ts" />
import type { CSSProperties, HTMLAttributes, KeyboardEvent, ReactNode } from 'react';
import type { Box } from './geometry';
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
  art: ReactNode;
  children?: ReactNode;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
};

export function Stage({ width, height, art, children, onKeyDown }: StageProps) {
  return (
    <div className="pk-root" style={{ minWidth: TARGET, minHeight: TARGET }}>
      <div
        className="pk-stage"
        style={vars({ '--pk-ratio': width / height })}
        {...(onKeyDown ? { onKeyDown } : {})}
      >
        <svg
          className="pk-svg"
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
          focusable="false"
        >
          {art}
        </svg>
        {children}
      </div>
    </div>
  );
}

export function Fill(props: HTMLAttributes<HTMLDivElement>) {
  return <div className="pk-fill" {...props} />;
}

export function CurrentState({ id, text }: { id: string; text: string }) {
  return (
    <span id={id} className="pk-sr">
      {text}
    </span>
  );
}

export function Legend({
  x,
  y,
  text,
  current,
  centred = false,
}: {
  x: number;
  y: number;
  text: string;
  current: boolean;
  centred?: boolean;
}) {
  return (
    <text x={x} y={y} className="pk-legend" data-current={current} data-centred={centred}>
      {text}
    </text>
  );
}

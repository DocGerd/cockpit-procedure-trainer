import { useId } from 'react';
import type { ControlWidgetProps } from '../types';
import { CurrentState, Stage, hitStyle, vars } from './Stage';

const FILL = { x: 50, y: 50, w: 100, h: 100 };

export function CircuitBreaker({ position, label, positionLabels, onSet }: ControlWidgetProps) {
  const stateId = useId();
  const pulled = position === 'pulled';
  const text = positionLabels[String(position)] ?? String(position);

  const art = (
    <>
      <circle cx={50} cy={50} r={42} className="pk-bezel-dark" />
      <rect
        x={38}
        y={56}
        width={24}
        height={22}
        className="pk-legend-fill pk-move pk-stem"
        data-on={pulled}
      />
      <g className="pk-move pk-slide" style={vars({ '--pk-y': pulled ? -14 : 0 })}>
        <circle cx={50} cy={50} r={26} className="pk-cap-light" />
        <circle cx={50} cy={50} r={26} className="pk-mark" />
      </g>
    </>
  );

  return (
    <Stage width={100} height={100} art={art}>
      <button
        type="button"
        role="switch"
        className="pk-hit"
        style={hitStyle(FILL)}
        aria-label={label}
        aria-checked={!pulled}
        aria-describedby={stateId}
        onClick={() => onSet(pulled ? 'in' : 'pulled')}
      />
      <CurrentState id={stateId} text={text} />
    </Stage>
  );
}

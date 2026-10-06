import { useId } from 'react';
import type { ControlWidgetProps } from '../types';
import { CurrentState, Stage, hitStyle, vars } from './Stage';

const WIDTH = 100;
const HEIGHT = 92;
const FILL = { x: 50, y: 50, w: 100, h: 100 };
const BODY_Y = 46;
const LIFT = 16;

export function CircuitBreaker({
  position,
  label,
  placard,
  positionLabels,
  onSet,
}: ControlWidgetProps) {
  const stateId = useId();
  const pulled = position === 'pulled';
  const text = positionLabels[String(position)] ?? String(position);

  const art = (
    <>
      <circle cx={50} cy={BODY_Y} r={40} className="pk-bezel-dark" />
      <g className="pk-move pk-stem" data-on={pulled}>
        <rect x={38} y={BODY_Y + 6} width={24} height={26} className="pk-legend-fill" />
        <rect x={38} y={BODY_Y + 14} width={24} height={4} className="pk-bezel-dark" />
        <rect x={38} y={BODY_Y + 24} width={24} height={4} className="pk-bezel-dark" />
      </g>
      <g className="pk-move pk-slide" style={vars({ '--pk-y': pulled ? -LIFT : 0 })}>
        <circle cx={50} cy={BODY_Y} r={25} className="pk-cap-light" />
        <circle cx={50} cy={BODY_Y} r={25} className="pk-mark" />
      </g>
    </>
  );

  return (
    <Stage placard={placard} width={WIDTH} height={HEIGHT} art={art}>
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

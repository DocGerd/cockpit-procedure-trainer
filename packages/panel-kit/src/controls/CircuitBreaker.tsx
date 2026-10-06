import { useId } from 'react';
import type { ControlWidgetProps } from '../types';
import { EDGE, placard, placeTitle } from './legibility';
import type { Metrics } from './legibility';
import { CurrentState, Legend, Stage, hitStyle, vars } from './Stage';

const WIDTH = 100;
const HEIGHT = 120;
const FILL = { x: 50, y: 50, w: 100, h: 100 };
const BODY_Y = 46;
const LIFT = 16;
const PLACARD_Y = 106;

export function CircuitBreaker({ position, label, positionLabels, onSet }: ControlWidgetProps) {
  const stateId = useId();
  const pulled = position === 'pulled';
  const text = positionLabels[String(position)] ?? String(position);

  const art = (metrics: Metrics | undefined) => {
    const title = placeTitle(
      metrics,
      placard(label),
      WIDTH - 2 * EDGE,
      2 * (HEIGHT - PLACARD_Y - EDGE),
    );
    return (
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
        {title.show && (
          <Legend
            x={WIDTH / 2}
            y={PLACARD_Y}
            text={placard(label)}
            current
            font={title.fontSize}
            length={title.length}
            anchor="middle"
          />
        )}
      </>
    );
  };

  return (
    <Stage width={WIDTH} height={HEIGHT} art={art}>
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

import { useId } from 'react';
import type { ControlWidgetProps } from '../types';
import { circleBox, Knurl, paint, SoftShadow, useMaterialId } from '../materials';
import { CurrentState, Stage, hitStyle, vars } from './Stage';

const WIDTH = 100;
const HEIGHT = 92;
const FILL = { x: 50, y: 50, w: 100, h: 100 };
const BODY_Y = 46;
const LIFT = 16;
// A pulled button stands higher, so its shadow falls further below it than the button rises.
const SHADOW_LAG = 7;

export function CircuitBreaker({
  position,
  label,
  placard,
  positionLabels,
  onSet,
}: ControlWidgetProps) {
  const stateId = useId();
  const kit = useMaterialId('breaker');
  const pulled = position === 'pulled';
  const text = positionLabels[String(position)] ?? String(position);

  const art = (
    <>
      <SoftShadow box={circleBox(50, BODY_Y, 40)} offset={[0.5, 1.3]} blur={1.6} />
      <circle cx={50} cy={BODY_Y} r={40} style={{ fill: paint(kit, 'bezel') }} />
      <Knurl
        cx={50}
        cy={BODY_Y}
        inner={35}
        outer={40}
        ridges={36}
        width={1.1}
        token="metal-shade"
        opacity={0.6}
      />
      <circle cx={50} cy={BODY_Y} r={34} style={{ fill: paint(kit, 'lip') }} />
      <circle cx={50} cy={BODY_Y} r={29} style={{ fill: paint(kit, 'bezel') }} />
      <circle cx={50} cy={BODY_Y} r={26.5} style={{ fill: 'var(--panel-metal-shade)' }} />
      <g className="pk-move pk-stem" data-on={pulled}>
        <rect x={39} y={BODY_Y + 6} width={22} height={26} style={{ fill: paint(kit, 'ridge') }} />
        <rect x={39} y={BODY_Y + 8} width={22} height={6} style={{ fill: paint(kit, 'band') }} />
        <rect x={39} y={BODY_Y + 18} width={22} height={6} style={{ fill: paint(kit, 'band') }} />
      </g>
      <g
        className="pk-move pk-slide"
        style={vars({ '--pk-y': pulled ? -LIFT + SHADOW_LAG : 0 })}
        fillOpacity={pulled ? 0.5 : 0.6}
      >
        <circle
          cx={50 + (pulled ? 3 : 1)}
          cy={BODY_Y + (pulled ? 2 : 2.5)}
          r={pulled ? 26.5 : 25.5}
          style={{ fill: 'var(--panel-shadow)' }}
        />
      </g>
      <g className="pk-move pk-slide" style={vars({ '--pk-y': pulled ? -LIFT : 0 })}>
        <circle cx={50} cy={BODY_Y} r={25} style={{ fill: paint(kit, 'plastic') }} />
        <circle cx={50} cy={BODY_Y} r={21.5} style={{ fill: paint(kit, 'dome') }} />
        <path
          d={`M${50 - 23} ${BODY_Y - 3}A23 23 0 0 1 ${50 - 3} ${BODY_Y - 23}`}
          fill="none"
          strokeWidth={1.5}
          strokeLinecap="round"
          style={{ stroke: paint(kit, 'specular') }}
        />
      </g>
    </>
  );

  return (
    <Stage
      kit={kit}
      materials={['bezel', 'lip', 'plastic', 'dome', 'specular', 'band', 'ridge']}
      placard={placard}
      width={WIDTH}
      height={HEIGHT}
      art={art}
    >
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

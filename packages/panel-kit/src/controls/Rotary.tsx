import type { ReactNode } from 'react';
import type { ControlWidgetProps } from '../types';
import { detentAngles, polar } from './geometry';
import { namedPositions, springBackOf } from './positions';
import { PositionGroup } from './PositionGroup';
import { Legend, Stage, vars } from './Stage';

const SIZE = 120;
const CENTRE = SIZE / 2;
const TICK = { from: 32, to: 38 };
const LEGEND_RADIUS = 50;
const HIT_RADIUS = (45 / SIZE) * 100;
const HIT_SIZE = 26;

function Rotary(props: ControlWidgetProps & { head: ReactNode }) {
  const { control, position, label, positionLabels, head, onSet, onPress, onRelease } = props;
  const positions = namedPositions(control);
  const current = positions.indexOf(position as string);
  const angles = detentAngles(positions.length);
  const boxes = angles.map((angle) => {
    const offset = polar(angle, HIT_RADIUS);
    return { x: 50 + offset.x, y: 50 + offset.y, w: HIT_SIZE, h: HIT_SIZE };
  });

  const art = (
    <>
      <circle cx={CENTRE} cy={CENTRE} r={42} className="pk-bezel-dark" />
      {positions.map((id, index) => {
        const angle = angles[index] ?? 0;
        const from = polar(angle, TICK.from);
        const to = polar(angle, TICK.to);
        const text = polar(angle, LEGEND_RADIUS);
        return (
          <g key={id}>
            <line
              className="pk-line"
              x1={CENTRE + from.x}
              y1={CENTRE + from.y}
              x2={CENTRE + to.x}
              y2={CENTRE + to.y}
            />
            <Legend
              x={CENTRE + text.x}
              y={CENTRE + text.y}
              text={positionLabels[id] ?? id}
              current={index === current}
              centred
            />
          </g>
        );
      })}
      <g transform={`translate(${CENTRE} ${CENTRE})`}>
        <g
          className="pk-move pk-turn"
          style={vars({ '--pk-angle': angles[Math.max(current, 0)] ?? 0 })}
        >
          {head}
        </g>
      </g>
    </>
  );

  return (
    <Stage width={SIZE} height={SIZE} art={art}>
      <PositionGroup
        label={label}
        positions={positions}
        position={position}
        labels={positionLabels}
        boxes={boxes}
        direction="clockwise"
        springBack={springBackOf(control)}
        onSet={onSet}
        onPress={onPress}
        onRelease={onRelease}
      />
    </Stage>
  );
}

export function RotaryKnob(props: ControlWidgetProps) {
  return (
    <Rotary
      {...props}
      head={
        <>
          <circle r={26} className="pk-cap-light" />
          <circle r={26} className="pk-mark" />
          <rect x={-2.5} y={-23} width={5} height={15} rx={2.5} className="pk-bezel-dark" />
        </>
      }
    />
  );
}

export function KeySwitch(props: ControlWidgetProps) {
  return (
    <Rotary
      {...props}
      head={
        <>
          <circle r={18} className="pk-bezel" />
          <rect x={-5} y={-32} width={10} height={34} rx={3} className="pk-cap-light" />
          <circle cy={-32} r={9} className="pk-cap-light" />
          <circle cy={-32} r={3.5} className="pk-bezel-dark" />
        </>
      }
    />
  );
}

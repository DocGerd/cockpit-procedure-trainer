import type { ControlWidgetProps } from '../types';
import { along, verticalBoxes } from './geometry';
import { namedPositions, springBackOf } from './positions';
import { PositionGroup } from './PositionGroup';
import { Legend, Stage, vars } from './Stage';

const WIDTH = 120;
const HEIGHT = 100;
const PIVOT = { x: 32, y: 50 };
const REACH = 38;

export function Toggle({
  control,
  position,
  label,
  positionLabels,
  onSet,
  onPress,
  onRelease,
}: ControlWidgetProps) {
  const positions = namedPositions(control);
  const current = positions.indexOf(position as string);
  const ys = positions.map(
    (_, index) => PIVOT.y + REACH - along(index, positions.length) * 2 * REACH,
  );
  const angle = 180 * (1 - along(Math.max(current, 0), positions.length));

  const art = (
    <>
      <rect x={8} y={6} width={48} height={88} rx={10} className="pk-bezel-dark" />
      <circle cx={PIVOT.x} cy={PIVOT.y} r={14} className="pk-bezel" />
      <g transform={`translate(${PIVOT.x} ${PIVOT.y})`}>
        <g className="pk-move pk-turn" style={vars({ '--pk-angle': angle })}>
          <rect x={-3.5} y={-REACH} width={7} height={REACH} rx={3.5} className="pk-cap-light" />
          <circle cy={-REACH} r={7} className="pk-cap" />
        </g>
      </g>
      {positions.map((id, index) => (
        <Legend
          key={id}
          x={78}
          y={ys[index] ?? 0}
          text={positionLabels[id] ?? id}
          current={index === current}
        />
      ))}
    </>
  );

  return (
    <Stage width={WIDTH} height={HEIGHT} art={art}>
      <PositionGroup
        label={label}
        positions={positions}
        position={position}
        labels={positionLabels}
        boxes={verticalBoxes(ys)}
        direction="up"
        springBack={springBackOf(control)}
        onSet={onSet}
        onPress={onPress}
        onRelease={onRelease}
      />
    </Stage>
  );
}

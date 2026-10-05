import type { ControlWidgetProps } from '../types';
import { verticalBoxes } from './geometry';
import { namedPositions, springBackOf } from './positions';
import { PositionGroup } from './PositionGroup';
import { Legend, Stage, vars } from './Stage';

const TOP = 12;
const SPAN = 76;

export function Rocker({
  control,
  position,
  label,
  positionLabels,
  onSet,
  onPress,
  onRelease,
}: ControlWidgetProps) {
  const positions = namedPositions(control);
  const count = positions.length;
  const current = positions.indexOf(position as string);
  const band = count > 0 ? SPAN / count : SPAN;
  const bandOf = (index: number) => (count - 1 - index) * band;
  const ys = positions.map((_, index) => TOP + bandOf(index) + band / 2);

  const art = (
    <>
      <rect x={8} y={6} width={48} height={88} rx={10} className="pk-bezel-dark" />
      <rect x={14} y={TOP} width={36} height={SPAN} rx={6} className="pk-cap-light" />
      <g className="pk-move pk-slide" style={vars({ '--pk-y': bandOf(Math.max(current, 0)) })}>
        <rect x={14} y={TOP} width={36} height={band} rx={6} className="pk-bezel" />
      </g>
      {positions.map((id, index) => (
        <Legend
          key={id}
          x={64}
          y={ys[index] ?? 0}
          text={positionLabels[id] ?? id}
          current={index === current}
        />
      ))}
    </>
  );

  return (
    <Stage width={100} height={100} art={art}>
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

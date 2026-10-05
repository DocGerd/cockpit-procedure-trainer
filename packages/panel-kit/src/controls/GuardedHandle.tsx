import type { ControlWidgetProps } from '../types';
import { along, verticalBoxes } from './geometry';
import { namedPositions } from './positions';
import { PositionGroup } from './PositionGroup';
import { Legend, Stage, hitStyle, vars } from './Stage';

const HANDLE = { top: 46, travel: 40 };
const FLAP_OPEN = -58;
const GUARD_ZONE = 40;

export function GuardedHandle({
  control,
  position,
  guardOpen,
  label,
  positionLabels,
  onSet,
  onPress,
  onRelease,
  onOpenGuard,
  onCloseGuard,
}: ControlWidgetProps) {
  const positions = namedPositions(control);
  const current = positions.indexOf(position as string);
  const ys = positions.map(
    (_, index) => HANDLE.top + along(index, positions.length) * HANDLE.travel,
  );
  const offset = ys[Math.max(current, 0)] ?? HANDLE.top;

  const art = (
    <>
      <rect x={8} y={6} width={48} height={88} rx={8} className="pk-bezel-dark" />
      <rect
        x={28}
        y={HANDLE.top - 4}
        width={8}
        height={HANDLE.travel + 8}
        rx={4}
        className="pk-face"
      />
      <g transform={`translate(0 ${HANDLE.top})`}>
        <g className="pk-move pk-slide" style={vars({ '--pk-y': offset - HANDLE.top })}>
          <rect x={14} y={-5} width={36} height={10} rx={5} className="pk-cap-light" />
        </g>
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
      <g className="pk-move pk-slide" style={vars({ '--pk-y': guardOpen ? FLAP_OPEN : 0 })}>
        <rect x={10} y={14} width={44} height={72} rx={6} className="pk-flap" />
      </g>
    </>
  );

  const guardBox = guardOpen
    ? { x: 50, y: GUARD_ZONE / 2, w: 100, h: GUARD_ZONE }
    : { x: 50, y: 50, w: 100, h: 100 };

  return (
    <Stage width={100} height={100} art={art}>
      {guardOpen && (
        <PositionGroup
          label={label}
          positions={positions}
          position={position}
          labels={positionLabels}
          boxes={verticalBoxes(ys, GUARD_ZONE)}
          direction="up"
          onSet={onSet}
          onPress={onPress}
          onRelease={onRelease}
        />
      )}
      <button
        type="button"
        className="pk-hit"
        style={hitStyle(guardBox)}
        aria-label={label}
        aria-expanded={guardOpen}
        onClick={guardOpen ? onCloseGuard : onOpenGuard}
      />
    </Stage>
  );
}

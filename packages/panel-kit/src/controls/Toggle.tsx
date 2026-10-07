import type { ControlWidgetProps } from '../types';
import { circleBox, paint, Screw, SoftShadow, useMaterialId } from '../materials';
import { along, minGap, verticalBoxes } from './geometry';
import { EDGE, placard as capitals, placeLegends } from './legibility';
import { namedPositions, springBackOf } from './positions';
import { PositionGroup } from './PositionGroup';
import type { Metrics } from './legibility';
import { Legend, Stage, vars } from './Stage';

const WIDTH = 120;
const HEIGHT = 100;
const PIVOT = { x: 32, y: 50 };
const REACH = 38;
const LEGEND_X = 78;
const PLATE = { x: 8, y: 6, width: 48, height: 88, rx: 10 };
const NUT = Array.from({ length: 6 }, (_, index) => {
  const turn = (index * Math.PI) / 3;
  return `${PIVOT.x + 14 * Math.cos(turn)},${PIVOT.y + 14 * Math.sin(turn)}`;
}).join(' ');
const BAT = `M-4.5 0L-3 ${-REACH}H3L4.5 0Z`;

export function Toggle({
  control,
  position,
  label,
  placard,
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

  const kit = useMaterialId('toggle');

  const art = (metrics: Metrics | undefined) => {
    const legends = placeLegends(
      metrics,
      positions.map((id) => ({ text: capitals(id), room: WIDTH - LEGEND_X - EDGE })),
      minGap(ys),
    );
    return (
      <>
        <SoftShadow box={PLATE} offset={[0.6, 1.6]} blur={2} />
        <rect {...PLATE} style={{ fill: paint(kit, 'plate') }} />
        <rect
          x={PLATE.x + 1}
          y={PLATE.y + 1}
          width={PLATE.width - 2}
          height={PLATE.height - 2}
          rx={PLATE.rx - 1}
          fill="none"
          strokeWidth={2}
          style={{ stroke: paint(kit, 'bezel') }}
        />
        <Screw id={kit} cx={17} cy={14} r={3.5} angle={30} />
        <Screw id={kit} cx={17} cy={86} r={3.5} angle={105} />
        <SoftShadow box={circleBox(PIVOT.x, PIVOT.y, 14)} offset={[0.8, 2]} blur={2} />
        <polygon points={NUT} style={{ fill: paint(kit, 'bezel') }} />
        <circle cx={PIVOT.x} cy={PIVOT.y} r={10} style={{ fill: paint(kit, 'lip') }} />
        <circle cx={PIVOT.x} cy={PIVOT.y} r={7.5} style={{ fill: paint(kit, 'bezel') }} />
        <g transform={`translate(${PIVOT.x + 2} ${PIVOT.y + 3.5})`} opacity={0.45}>
          <g className="pk-move pk-turn" style={vars({ '--pk-angle': angle })}>
            <path d={BAT} style={{ fill: 'var(--panel-shadow)' }} />
            <circle cy={-REACH} r={7.5} style={{ fill: 'var(--panel-shadow)' }} />
          </g>
        </g>
        <g transform={`translate(${PIVOT.x} ${PIVOT.y})`}>
          <g className="pk-move pk-turn" style={vars({ '--pk-angle': angle })}>
            <path d={BAT} style={{ fill: paint(kit, 'chrome') }} />
            <g transform={`translate(0 ${-REACH})`}>
              {/* Turned back against the bat, so the ball's highlight stays up-left. */}
              <g className="pk-move pk-turn" style={vars({ '--pk-angle': -angle })}>
                <circle r={7} style={{ fill: paint(kit, 'chrome-dome') }} />
              </g>
            </g>
          </g>
        </g>
        {legends.show &&
          positions.map((id, index) => (
            <Legend
              key={id}
              x={LEGEND_X}
              y={ys[index] ?? 0}
              text={capitals(id)}
              current={index === current}
              font={legends.fontSize}
            />
          ))}
      </>
    );
  };

  return (
    <Stage
      kit={kit}
      materials={['plate', 'bezel', 'lip', 'chrome', 'chrome-dome', 'screw']}
      placard={placard}
      width={WIDTH}
      height={HEIGHT}
      art={art}
    >
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

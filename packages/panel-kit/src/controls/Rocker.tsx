import type { ControlWidgetProps } from '../types';
import { LinearGradient, paint, SoftShadow, useMaterialId } from '../materials';
import type { Stop } from '../materials';
import { minGap, verticalBoxes } from './geometry';
import { EDGE, placard as capitals, placeLegends } from './legibility';
import { namedPositions, springBackOf } from './positions';
import { PositionGroup } from './PositionGroup';
import type { Metrics } from './legibility';
import { Legend, Stage, vars } from './Stage';

const TOP = 12;
const SPAN = 76;
const WIDTH = 100;
const LEGEND_X = 64;
const FRAME = { x: 8, y: 6, width: 48, height: 88, rx: 10 };
const WELL = { x: 12, y: 10, width: 40, height: 80, rx: 7 };
const PADDLE = { x: 14, y: TOP, width: 36, height: SPAN, rx: 6 };
// The pressed end sinks into the well: the raised paddle above it throws its shadow onto it.
const PRESSED: readonly Stop[] = [
  [0, 'shadow', 0.75],
  [0.4, 'shadow', 0.3],
  [1, 'plastic-light', 0.12],
];

export function Rocker({
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
  const count = positions.length;
  const current = positions.indexOf(position as string);
  const band = count > 0 ? SPAN / count : SPAN;
  const bandOf = (index: number) => (count - 1 - index) * band;
  const ys = positions.map((_, index) => TOP + bandOf(index) + band / 2);

  const kit = useMaterialId('rocker');

  const art = (metrics: Metrics | undefined) => {
    const legends = placeLegends(
      metrics,
      positions.map((id) => ({ text: capitals(id), room: WIDTH - LEGEND_X - EDGE })),
      minGap(ys),
    );
    return (
      <>
        <SoftShadow box={FRAME} offset={[0.5, 1.4]} blur={1.6} />
        <rect {...FRAME} style={{ fill: paint(kit, 'plastic') }} />
        <rect {...WELL} style={{ fill: paint(kit, 'lip') }} />
        <rect {...PADDLE} style={{ fill: paint(kit, 'plastic') }} />
        <rect
          x={PADDLE.x + 2}
          y={PADDLE.y + 2}
          width={PADDLE.width - 4}
          height={PADDLE.height - 4}
          rx={PADDLE.rx - 2}
          style={{ fill: 'var(--panel-plastic)' }}
        />
        <path
          d={`M${PADDLE.x + 1} ${PADDLE.y + PADDLE.height * 0.6}V${PADDLE.y + PADDLE.rx}a${PADDLE.rx - 1} ${PADDLE.rx - 1} 0 0 1 ${PADDLE.rx - 1} ${-(PADDLE.rx - 1)}H${PADDLE.x + PADDLE.width * 0.75}`}
          fill="none"
          strokeWidth={1.2}
          strokeLinecap="round"
          style={{ stroke: paint(kit, 'specular') }}
        />
        <g className="pk-move pk-slide" style={vars({ '--pk-y': bandOf(Math.max(current, 0)) })}>
          <rect
            x={PADDLE.x}
            y={TOP}
            width={PADDLE.width}
            height={band}
            rx={PADDLE.rx}
            style={{ fill: 'var(--panel-plastic-shade)' }}
          />
          <rect
            x={PADDLE.x}
            y={TOP}
            width={PADDLE.width}
            height={band}
            rx={PADDLE.rx}
            style={{ fill: paint(kit, 'pressed') }}
          />
          {[0.35, 0.55, 0.75].map((at) => (
            <line
              key={at}
              x1={PADDLE.x + 7}
              x2={PADDLE.x + PADDLE.width - 7}
              y1={TOP + band * at}
              y2={TOP + band * at}
              strokeWidth={1.4}
              strokeLinecap="round"
              style={{ stroke: 'var(--panel-plastic)' }}
            />
          ))}
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
      materials={['plastic', 'lip', 'specular']}
      defs={<LinearGradient id={`${kit}-pressed`} from={[0, 0]} to={[0, 1]} stops={PRESSED} />}
      placard={placard}
      width={100}
      height={100}
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

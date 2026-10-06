import type { ReactNode } from 'react';
import type { ControlWidgetProps } from '../types';
import { detentAngles, polar } from './geometry';
import { namedPositions, springBackOf } from './positions';
import { PositionGroup } from './PositionGroup';
import { EDGE, placard, placeLegends } from './legibility';
import type { Metrics } from './legibility';
import type { Anchor } from './Stage';
import { Legend, Stage, vars } from './Stage';

const SIZE = 120;
const CENTRE = SIZE / 2;
const BEZEL = 31;
const HEAD_SCALE = 0.72;
const TICK = { from: 23, to: 28 };
const LEGEND_RADIUS = BEZEL + 4;
const SIDE = 0.35;
const HIT_RADIUS = (45 / SIZE) * 100;
const HIT_SIZE = 26;

type Slot = { x: number; y: number; anchor: Anchor; room: number };

function slotFor(angle: number): Slot {
  const { x, y } = polar(angle, LEGEND_RADIUS);
  if (Math.abs(x) < SIDE * LEGEND_RADIUS) {
    return { x: CENTRE + x, y: CENTRE + y, anchor: 'middle', room: SIZE - 2 * EDGE };
  }
  const right = x > 0;
  return {
    x: CENTRE + x,
    y: CENTRE + y,
    anchor: right ? 'start' : 'end',
    room: right ? SIZE - EDGE - CENTRE - x : CENTRE + x - EDGE,
  };
}

function sideGap(slots: readonly Slot[]): number {
  let gap = Infinity;
  for (const [index, slot] of slots.entries()) {
    for (const other of slots.slice(index + 1)) {
      if (slot.anchor === other.anchor || slot.anchor === 'middle' || other.anchor === 'middle') {
        if (slot.anchor === other.anchor) gap = Math.min(gap, Math.abs(slot.y - other.y));
      }
    }
  }
  return gap;
}

function Rotary(props: ControlWidgetProps & { head: ReactNode }) {
  const { control, position, label, positionLabels, head, onSet, onPress, onRelease } = props;
  const positions = namedPositions(control);
  const current = positions.indexOf(position as string);
  const angles = detentAngles(positions.length);
  const boxes = angles.map((angle) => {
    const offset = polar(angle, HIT_RADIUS);
    return { x: 50 + offset.x, y: 50 + offset.y, w: HIT_SIZE, h: HIT_SIZE };
  });

  const slots = angles.map(slotFor);

  const art = (metrics: Metrics | undefined) => {
    const legends = placeLegends(
      metrics,
      positions.map((id, index) => ({
        text: placard(id),
        room: slots[index]?.room ?? 0,
      })),
      sideGap(slots),
    );
    return (
      <>
        <circle cx={CENTRE} cy={CENTRE} r={BEZEL} className="pk-bezel-dark" />
        {positions.map((id, index) => {
          const angle = angles[index] ?? 0;
          const from = polar(angle, TICK.from);
          const to = polar(angle, TICK.to);
          const slot = slots[index];
          return (
            <g key={id}>
              <line
                className="pk-line"
                x1={CENTRE + from.x}
                y1={CENTRE + from.y}
                x2={CENTRE + to.x}
                y2={CENTRE + to.y}
              />
              {legends.show && slot !== undefined && (
                <Legend
                  x={slot.x}
                  y={
                    slot.anchor === 'middle'
                      ? slot.y + Math.sign(slot.y - CENTRE) * (legends.fontSize / 2)
                      : slot.y
                  }
                  text={placard(id)}
                  current={index === current}
                  font={legends.fontSize}
                  anchor={slot.anchor}
                />
              )}
            </g>
          );
        })}
        <g transform={`translate(${CENTRE} ${CENTRE})`}>
          <g
            className="pk-move pk-turn"
            style={vars({ '--pk-angle': angles[Math.max(current, 0)] ?? 0 })}
          >
            <g transform={`scale(${HEAD_SCALE})`}>{head}</g>
          </g>
        </g>
      </>
    );
  };

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

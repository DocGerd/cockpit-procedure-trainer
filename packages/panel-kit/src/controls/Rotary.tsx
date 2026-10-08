import type { ReactNode } from 'react';
import type { ControlWidgetProps } from '../types';
import { CAST, Chamfer, circleBox, Knurl, paint, SoftShadow, useMaterialId } from '../materials';
import type { KitMaterial } from '../materials';
import { detentAngles, polar } from './geometry';
import { namedPositions, springBackOf } from './positions';
import { PositionGroup } from './PositionGroup';
import { EDGE, placard as capitals, placeLegends } from './legibility';
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

/** A knob or key in its own units (scaled by HEAD_SCALE): fixed shading, and the part that turns. */
type Head = {
  materials: readonly KitMaterial[];
  still: ReactNode;
  shadow?: ReactNode;
  turning: ReactNode;
};

function Rotary(props: ControlWidgetProps & { kit: string; head: Head }) {
  const {
    control,
    position,
    label,
    placard,
    positionLabels,
    kit,
    head,
    onSet,
    onPress,
    onRelease,
  } = props;
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
        text: capitals(id),
        room: slots[index]?.room ?? 0,
      })),
      sideGap(slots),
    );
    return (
      <>
        <SoftShadow box={circleBox(CENTRE, CENTRE, BEZEL)} {...CAST.medium} />
        <circle cx={CENTRE} cy={CENTRE} r={BEZEL} style={{ fill: paint(kit, 'plate') }} />
        <Chamfer id={kit} box={circleBox(CENTRE, CENTRE, BEZEL)} width={1.5} />
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
                  text={capitals(id)}
                  current={index === current}
                  font={legends.fontSize}
                  anchor={slot.anchor}
                />
              )}
            </g>
          );
        })}
        <g transform={`translate(${CENTRE} ${CENTRE}) scale(${HEAD_SCALE})`}>{head.still}</g>
        {head.shadow !== undefined && (
          <g transform={`translate(${CENTRE + 2} ${CENTRE + 4.5})`} fillOpacity={0.55}>
            <g
              className="pk-move pk-turn"
              style={vars({ '--pk-angle': angles[Math.max(current, 0)] ?? 0 })}
            >
              <g transform={`scale(${HEAD_SCALE})`}>{head.shadow}</g>
            </g>
          </g>
        )}
        <g transform={`translate(${CENTRE} ${CENTRE})`}>
          <g
            className="pk-move pk-turn"
            style={vars({ '--pk-angle': angles[Math.max(current, 0)] ?? 0 })}
          >
            <g transform={`scale(${HEAD_SCALE})`}>{head.turning}</g>
          </g>
        </g>
      </>
    );
  };

  return (
    <Stage
      kit={kit}
      materials={[...head.materials, 'chamfer']}
      placard={placard}
      width={SIZE}
      height={SIZE}
      art={art}
    >
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
  const kit = useMaterialId('knob');
  return (
    <Rotary
      {...props}
      kit={kit}
      head={{
        materials: ['plate', 'bezel', 'plastic', 'dome', 'specular'],
        still: (
          <>
            <SoftShadow box={circleBox(0, 0, 26)} {...CAST.large} />
            <circle r={26} style={{ fill: paint(kit, 'plastic') }} />
            <Knurl
              cx={0}
              cy={0}
              inner={21.5}
              outer={26}
              ridges={40}
              width={1.4}
              token="plastic-shade"
            />
            <circle r={21} style={{ fill: 'var(--panel-plastic-shade)' }} />
            <circle r={20} style={{ fill: paint(kit, 'dome') }} />
            <path
              d="M-24.5 -4A25 25 0 0 1 -4 -24.5"
              fill="none"
              strokeWidth={1.6}
              strokeLinecap="round"
              style={{ stroke: paint(kit, 'specular') }}
            />
          </>
        ),
        turning: (
          <line
            y1={-5}
            y2={-25}
            strokeWidth={4}
            strokeLinecap="round"
            style={{ stroke: 'var(--panel-legend)' }}
          />
        ),
      }}
    />
  );
}

const KEY = 'M-3.5 4V-26H3.5V4Z';
const BOW = 'M-10 -36a8 8 0 0 1 8 -8h4a8 8 0 0 1 8 8v4a8 8 0 0 1 -8 8h-4a8 8 0 0 1 -8 -8z';

export function KeySwitch(props: ControlWidgetProps) {
  const kit = useMaterialId('key');
  const metal = { fill: paint(kit, 'chrome') };
  return (
    <Rotary
      {...props}
      kit={kit}
      head={{
        materials: ['plate', 'bezel', 'lip', 'cap', 'chrome'],
        still: (
          <>
            <SoftShadow box={circleBox(0, 0, 19)} {...CAST.medium} />
            <circle r={19} style={{ fill: paint(kit, 'bezel') }} />
            <circle r={16} style={{ fill: paint(kit, 'lip') }} />
            <circle r={13} style={{ fill: paint(kit, 'cap') }} />
          </>
        ),
        shadow: (
          <>
            <path d={KEY} style={{ fill: 'var(--panel-shadow)' }} />
            <path d={BOW} style={{ fill: 'var(--panel-shadow)' }} />
          </>
        ),
        turning: (
          <>
            <rect
              x={-2}
              y={-11}
              width={4}
              height={22}
              rx={1}
              style={{ fill: 'var(--panel-shadow)' }}
            />
            <path d={KEY} style={metal} />
            <path d={BOW} style={metal} />
            <circle cy={-34} r={3.2} style={{ fill: 'var(--panel-metal-shade)' }} />
          </>
        ),
      }}
    />
  );
}

import { useEffect, useId, useRef } from 'react';
import type { ControlWidgetProps } from '../types';
import {
  CAST,
  Chamfer,
  LinearGradient,
  paint,
  Screw,
  SoftShadow,
  useMaterialId,
} from '../materials';
import type { Stop } from '../materials';
import { along, minGap, verticalBoxes } from './geometry';
import { EDGE, placard as capitals, placeLegends } from './legibility';
import type { Metrics } from './legibility';
import { namedPositions } from './positions';
import { PositionGroup } from './PositionGroup';
import { Legend, Stage, hitStyle, vars } from './Stage';

const HANDLE = { top: 46, travel: 40 };
const FLAP_OPEN = 0.18;
const WIDTH = 100;
const LEGEND_X = 64;
const GUARD_ZONE = 40;
const PLATE = { x: 8, y: 6, width: 48, height: 88, rx: 8 };
const GATE = { x: 27, y: HANDLE.top - 5, width: 10, height: HANDLE.travel + 10, rx: 5 };
const GRIP = { x: 14, y: -5, width: 36, height: 10, rx: 5 };
const FLAP = { x: 10, y: 14, width: 44, height: 72, rx: 6 };
const OPEN_EDGE = FLAP.y + FLAP.height * FLAP_OPEN;
const LID_SHADOW: readonly Stop[] = [
  [0, 'shadow', 0.7],
  [1, 'shadow', 0],
];

export function GuardedHandle({
  control,
  position,
  guardOpen,
  label,
  placard,
  positionLabels,
  onSet,
  onPress,
  onRelease,
  onOpenGuard,
  onCloseGuard,
}: ControlWidgetProps) {
  const groupId = useId();
  const kit = useMaterialId('guard');
  const guard = useRef<HTMLButtonElement>(null);
  const group = useRef<HTMLDivElement>(null);
  const positions = namedPositions(control);
  const current = positions.indexOf(position as string);
  const ys = positions.map(
    (_, index) => HANDLE.top + along(index, positions.length) * HANDLE.travel,
  );
  const offset = ys[Math.max(current, 0)] ?? HANDLE.top;

  useEffect(() => {
    if (guardOpen && document.activeElement === guard.current) {
      group.current?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')?.focus();
    }
  }, [guardOpen]);

  const art = (metrics: Metrics | undefined) => {
    const legends = placeLegends(
      metrics,
      positions.map((id) => ({ text: capitals(id), room: WIDTH - LEGEND_X - EDGE })),
      minGap(ys),
    );
    return (
      <>
        <SoftShadow box={PLATE} {...CAST.medium} />
        <rect {...PLATE} style={{ fill: paint(kit, 'plate') }} />
        <Chamfer id={kit} box={PLATE} width={3} />
        <rect
          x={PLATE.x + 3.75}
          y={PLATE.y + 3.75}
          width={PLATE.width - 7.5}
          height={PLATE.height - 7.5}
          rx={PLATE.rx - 3}
          fill="none"
          strokeWidth={1.5}
          style={{ stroke: paint(kit, 'lip') }}
        />
        <Screw id={kit} cx={15} cy={90} r={2.6} angle={40} />
        <Screw id={kit} cx={49} cy={90} r={2.6} angle={110} />
        <rect {...GATE} style={{ fill: 'var(--panel-plastic-shade)' }} />
        <rect {...GATE} style={{ fill: paint(kit, 'well') }} />
        <g transform={`translate(0 ${HANDLE.top})`}>
          <g className="pk-move pk-slide" style={vars({ '--pk-y': offset - HANDLE.top })}>
            <SoftShadow box={GRIP} {...CAST.large} />
            <rect {...GRIP} style={{ fill: paint(kit, 'chrome-across') }} />
            <rect
              x={GRIP.x + 2.6}
              y={GRIP.y + 0.6}
              width={GRIP.width - 5.2}
              height={0.8}
              rx={0.4}
              style={{ fill: paint(kit, 'specular') }}
            />
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
        <g className="pk-move pk-fold" style={vars({ '--pk-fold': guardOpen ? FLAP_OPEN : 1 })}>
          <SoftShadow box={FLAP} {...CAST.medium} />
          <rect {...FLAP} opacity={0.7} style={{ fill: 'var(--panel-plastic-shade)' }} />
          <rect {...FLAP} style={{ fill: paint(kit, 'glare') }} />
          <path
            d={`M${FLAP.x + 6} ${FLAP.y + 40}L${FLAP.x + 26} ${FLAP.y + 6}H${FLAP.x + 34}L${FLAP.x + 14} ${FLAP.y + 40}Z`}
            opacity={0.14}
            style={{ fill: 'var(--panel-glare)' }}
          />
          <Chamfer id={kit} box={FLAP} width={2.4} />
          <rect
            x={FLAP.x}
            y={FLAP.y}
            width={FLAP.width}
            height={6}
            rx={3}
            style={{ fill: paint(kit, 'ridge-across') }}
          />
        </g>
        {guardOpen && (
          <>
            {/* The raised guard stands up off the hinge: its lit lip, and the shadow it throws below. */}
            <rect
              x={FLAP.x + 1}
              y={OPEN_EDGE + 0.5}
              width={FLAP.width - 2}
              height={5}
              style={{ fill: paint(kit, 'lid-shadow') }}
            />
            <rect
              x={FLAP.x + 1}
              y={OPEN_EDGE - 1.2}
              width={FLAP.width - 2}
              height={1.4}
              rx={0.7}
              opacity={0.75}
              style={{ fill: 'var(--panel-glare)' }}
            />
          </>
        )}
      </>
    );
  };

  const guardBox = guardOpen
    ? { x: 50, y: GUARD_ZONE / 2, w: 100, h: GUARD_ZONE }
    : { x: 50, y: 50, w: 100, h: 100 };

  return (
    <Stage
      kit={kit}
      defs={
        <LinearGradient id={`${kit}-lid-shadow`} from={[0, 0]} to={[0, 1]} stops={LID_SHADOW} />
      }
      materials={[
        'plate',
        'lip',
        'chamfer',
        'well',
        'ridge-across',
        'chrome-across',
        'screw',
        'specular',
        'glare',
      ]}
      placard={placard}
      width={100}
      height={100}
      art={art}
      onKeyDown={(event) => {
        if (!guardOpen || event.key !== 'Escape') return;
        guard.current?.focus();
        onCloseGuard();
      }}
    >
      <button
        ref={guard}
        type="button"
        className="pk-hit pk-above"
        style={hitStyle(guardBox)}
        aria-label={label}
        aria-expanded={guardOpen}
        aria-controls={guardOpen ? groupId : undefined}
        onClick={guardOpen ? onCloseGuard : onOpenGuard}
      />
      {guardOpen && (
        <PositionGroup
          label={label}
          positions={positions}
          position={position}
          labels={positionLabels}
          boxes={verticalBoxes(ys, GUARD_ZONE)}
          direction="up"
          groupProps={{ id: groupId, ref: group }}
          onSet={onSet}
          onPress={onPress}
          onRelease={onRelease}
        />
      )}
    </Stage>
  );
}

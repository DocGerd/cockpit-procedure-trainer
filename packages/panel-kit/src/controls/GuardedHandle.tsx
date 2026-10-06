import { useEffect, useId, useRef } from 'react';
import type { ControlWidgetProps } from '../types';
import { along, minGap, verticalBoxes } from './geometry';
import { EDGE, placard, placeLegends } from './legibility';
import type { Metrics } from './legibility';
import { namedPositions } from './positions';
import { PositionGroup } from './PositionGroup';
import { Legend, Stage, hitStyle, vars } from './Stage';

const HANDLE = { top: 46, travel: 40 };
const FLAP_OPEN = 0.18;
const WIDTH = 100;
const LEGEND_X = 64;
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
  const groupId = useId();
  const guard = useRef<HTMLButtonElement>(null);
  const group = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const positions = namedPositions(control);
  const current = positions.indexOf(position as string);
  const ys = positions.map(
    (_, index) => HANDLE.top + along(index, positions.length) * HANDLE.travel,
  );
  const offset = ys[Math.max(current, 0)] ?? HANDLE.top;

  useEffect(() => {
    if (guardOpen && !wasOpen.current && document.activeElement === guard.current) {
      group.current?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')?.focus();
    }
    wasOpen.current = guardOpen;
  }, [guardOpen]);

  const art = (metrics: Metrics | undefined) => {
    const legends = placeLegends(
      metrics,
      positions.map((id) => ({ text: placard(id), room: WIDTH - LEGEND_X - EDGE })),
      minGap(ys),
    );
    return (
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
        {legends.show &&
          positions.map((id, index) => (
            <Legend
              key={id}
              x={LEGEND_X}
              y={ys[index] ?? 0}
              text={placard(id)}
              current={index === current}
              font={legends.fontSize}
            />
          ))}
        <g className="pk-move pk-fold" style={vars({ '--pk-fold': guardOpen ? FLAP_OPEN : 1 })}>
          <rect x={10} y={14} width={44} height={72} rx={6} className="pk-flap" />
        </g>
      </>
    );
  };

  const guardBox = guardOpen
    ? { x: 50, y: GUARD_ZONE / 2, w: 100, h: GUARD_ZONE }
    : { x: 50, y: 50, w: 100, h: 100 };

  return (
    <Stage
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

import { useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { ControlWidgetProps } from '../types';
import {
  CAST,
  Chamfer,
  finish,
  LinearGradient,
  paint,
  SoftShadow,
  useMaterialId,
} from '../materials';
import { along, clamp01, minGap, verticalBoxes } from './geometry';
import { EDGE, placard as capitals, placeLegends } from './legibility';
import { namedPositions } from './positions';
import { PositionGroup } from './PositionGroup';
import type { Metrics } from './legibility';
import { Fill, Legend, Stage, TARGET, vars } from './Stage';

const SIZE = 100;
const LEGEND_X = 58;
const SLOT = { top: 12, bottom: 88 };
const KEY_STEP = 0.1;
const PAGE_STEP = 0.25;
const PLATE = { x: 8, y: 2, width: 44, height: 96, rx: 8 };
const GATE = { x: 25, y: SLOT.top - 1, width: 10, height: SLOT.bottom - SLOT.top + 2, rx: 5 };
const HANDLE = { x: 12, y: -9, width: 36, height: 18, rx: 5 };
const GRIP = [16, 18.5, 21, 39, 41.5, 44];

const yOf = (value: number) => SLOT.bottom - value * (SLOT.bottom - SLOT.top);

function valueAt(event: PointerEvent<HTMLElement>): number | undefined {
  const rect = event.currentTarget.getBoundingClientRect();
  if (rect.height <= 0) return undefined;
  const y = ((event.clientY - rect.top) / rect.height) * SIZE;
  return clamp01((SLOT.bottom - y) / (SLOT.bottom - SLOT.top));
}

function capture(element: HTMLElement, pointerId: number) {
  try {
    element.setPointerCapture?.(pointerId);
  } catch {
    // A synthetic pointer has nothing to capture; the drag still works while it stays over the lever.
  }
}

const round = (value: number) => Math.round(value * 1000) / 1000;

function keyValue(key: string, value: number): number | undefined {
  switch (key) {
    case 'ArrowUp':
    case 'ArrowRight':
      return clamp01(round(value + KEY_STEP));
    case 'ArrowDown':
    case 'ArrowLeft':
      return clamp01(round(value - KEY_STEP));
    case 'PageUp':
      return clamp01(round(value + PAGE_STEP));
    case 'PageDown':
      return clamp01(round(value - PAGE_STEP));
    case 'Home':
      return 0;
    case 'End':
      return 1;
    default:
      return undefined;
  }
}

export function Lever(props: ControlWidgetProps) {
  const { control, position, label, placard, positionLabels, onSet, onPress, onRelease } = props;
  const positions = namedPositions(control);
  const continuous = control.positions === 'continuous';
  const count = positions.length;
  const dragging = useRef(false);
  const sent = useRef<number | undefined>(undefined);

  const current = positions.indexOf(position as string);
  const value = continuous
    ? clamp01(typeof position === 'number' ? position : 0)
    : along(Math.max(current, 0), count);
  const ys = positions.map((_, index) => yOf(along(index, count)));

  function send(at: number) {
    if (continuous) {
      if (sent.current === at) return;
      sent.current = at;
      onSet(at);
      return;
    }
    const index = Math.round(at * (count - 1));
    if (sent.current === index) return;
    sent.current = index;
    const id = positions[index];
    if (id !== undefined && id !== position) onSet(id);
  }

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    const at = valueAt(event);
    if (at === undefined) return;
    dragging.current = true;
    sent.current = undefined;
    capture(event.currentTarget, event.pointerId);
    send(at);
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (!dragging.current) return;
    if ((event.buttons & 1) === 0) {
      dragging.current = false;
      return;
    }
    const at = valueAt(event);
    if (at !== undefined) send(at);
  }

  function endDrag() {
    dragging.current = false;
  }

  const pointer = {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const next = keyValue(event.key, value);
    if (next === undefined) return;
    event.preventDefault();
    if (next !== value) onSet(next);
  }

  const kit = useMaterialId('lever');

  const art = (metrics: Metrics | undefined) => {
    const legends = placeLegends(
      metrics,
      positions.map((id) => ({ text: capitals(id), room: SIZE - LEGEND_X - EDGE })),
      minGap(ys),
    );
    return (
      <>
        <SoftShadow box={PLATE} {...CAST.medium} />
        <rect {...PLATE} style={{ fill: paint(kit, 'plate') }} />
        <Chamfer id={kit} box={PLATE} width={2} />
        <rect {...GATE} style={{ fill: 'var(--panel-plastic-shade)' }} />
        <rect {...GATE} style={{ fill: paint(kit, 'well') }} />
        {positions.map((id, index) => (
          <g key={id}>
            <line className="pk-line" x1={14} x2={22} y1={ys[index]} y2={ys[index]} />
            {legends.show && (
              <Legend
                x={LEGEND_X}
                y={ys[index] ?? 0}
                text={capitals(id)}
                current={index === current}
                font={legends.fontSize}
              />
            )}
          </g>
        ))}
        <g className="pk-move pk-slide" style={vars({ '--pk-y': yOf(value) })}>
          <SoftShadow box={HANDLE} {...CAST.large} />
          <rect {...HANDLE} style={{ fill: paint(kit, 'plastic') }} />
          <rect
            x={HANDLE.x + 1.5}
            y={HANDLE.y + 1}
            width={HANDLE.width - 3}
            height={HANDLE.height - 5}
            rx={HANDLE.rx - 1}
            style={{ fill: paint(kit, 'top') }}
          />
          {GRIP.map((x) => (
            <line
              key={x}
              x1={x}
              x2={x}
              y1={HANDLE.y + 3}
              y2={HANDLE.y + HANDLE.height - 6}
              strokeWidth={1.2}
              style={{ stroke: 'var(--panel-plastic-shade)' }}
            />
          ))}
          <rect
            x={HANDLE.x + 3.5}
            y={HANDLE.y + 0.8}
            width={HANDLE.width - 7}
            height={1}
            rx={0.5}
            style={{ fill: paint(kit, 'specular') }}
          />
          <line className="pk-line" x1={25} x2={35} y1={-1.5} y2={-1.5} />
        </g>
      </>
    );
  };

  return (
    <Stage
      kit={kit}
      materials={['plate', 'chamfer', 'well', 'plastic', 'specular']}
      defs={<LinearGradient id={`${kit}-top`} from={[0, 0]} to={[0, 1]} stops={finish.dome} />}
      placard={placard}
      width={SIZE}
      height={SIZE}
      art={art}
    >
      {continuous ? (
        <Fill
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={value}
          aria-valuetext={`${Math.round(value * 100)}%`}
          style={{ minWidth: TARGET, minHeight: TARGET }}
          onKeyDown={onKeyDown}
          {...pointer}
        />
      ) : (
        <PositionGroup
          label={label}
          positions={positions}
          position={position}
          labels={positionLabels}
          boxes={verticalBoxes(ys)}
          direction="up"
          pointerHandled
          groupProps={pointer}
          onSet={onSet}
          onPress={onPress}
          onRelease={onRelease}
        />
      )}
    </Stage>
  );
}

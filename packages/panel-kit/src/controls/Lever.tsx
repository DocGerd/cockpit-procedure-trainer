import { useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { ControlWidgetProps } from '../types';
import { along, clamp01, verticalBoxes } from './geometry';
import { namedPositions } from './positions';
import { PositionGroup } from './PositionGroup';
import { Fill, Legend, Stage, TARGET, vars } from './Stage';

const SIZE = 100;
const SLOT = { top: 12, bottom: 88 };
const KEY_STEP = 0.05;
const PAGE_STEP = 0.1;

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
  const { control, position, label, positionLabels, onSet, onPress, onRelease } = props;
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

  const art = (
    <>
      <rect x={8} y={2} width={44} height={96} rx={8} className="pk-bezel-dark" />
      <rect
        x={26}
        y={SLOT.top}
        width={8}
        height={SLOT.bottom - SLOT.top}
        rx={4}
        className="pk-face"
      />
      {positions.map((id, index) => (
        <g key={id}>
          <line className="pk-line" x1={14} x2={22} y1={ys[index]} y2={ys[index]} />
          <Legend
            x={58}
            y={ys[index] ?? 0}
            text={positionLabels[id] ?? id}
            current={index === current}
          />
        </g>
      ))}
      <g className="pk-move pk-slide" style={vars({ '--pk-y': yOf(value) })}>
        <rect x={12} y={-9} width={36} height={18} rx={5} className="pk-cap-light" />
        <rect x={12} y={-9} width={36} height={18} rx={5} className="pk-mark" />
        <line className="pk-line" x1={18} x2={42} y1={0} y2={0} />
      </g>
    </>
  );

  return (
    <Stage width={SIZE} height={SIZE} art={art}>
      {continuous ? (
        <Fill
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={value}
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

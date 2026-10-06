import { useRef } from 'react';
import type { ComponentProps, KeyboardEvent, MouseEvent } from 'react';
import type { ControlPosition } from '@cpt/core';
import type { Box } from './geometry';
import { Fill, hitStyle } from './Stage';
import { useHold } from './use-hold';

type Direction = 'up' | 'clockwise';

type PositionGroupProps = {
  label: string;
  positions: readonly string[];
  position: ControlPosition;
  labels: Readonly<Record<string, string>>;
  boxes: readonly Box[];
  direction: Direction;
  springBack?: Readonly<Record<string, string>> | undefined;
  pointerHandled?: boolean;
  groupProps?: ComponentProps<'div'>;
  onSet(position: ControlPosition): void;
  onPress(position?: ControlPosition): void;
  onRelease(): void;
};

function stepFor(key: string, direction: Direction): number | undefined {
  const forward = direction === 'up' ? ['ArrowUp', 'ArrowRight'] : ['ArrowRight', 'ArrowDown'];
  const backward = direction === 'up' ? ['ArrowDown', 'ArrowLeft'] : ['ArrowLeft', 'ArrowUp'];
  if (forward.includes(key)) return 1;
  if (backward.includes(key)) return -1;
  return undefined;
}

export function PositionGroup({
  label,
  positions,
  position,
  labels,
  boxes,
  direction,
  springBack,
  pointerHandled = false,
  groupProps,
  onSet,
  onPress,
  onRelease,
}: PositionGroupProps) {
  const targets = useRef<(HTMLButtonElement | null)[]>([]);
  const hold = useHold(onRelease);
  const current = positions.indexOf(position as string);
  const isSpring = (id: string) => springBack !== undefined && Object.hasOwn(springBack, id);

  function choose(index: number) {
    const id = positions[index];
    if (id === undefined) return;
    targets.current[index]?.focus();
    if (isSpring(id)) hold.begin(() => onPress(id));
    else if (id !== position) onSet(id);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      choose(event.key === 'Home' ? 0 : positions.length - 1);
      return;
    }
    const step = stepFor(event.key, direction);
    if (step === undefined || positions.length === 0) return;
    event.preventDefault();
    choose(Math.min(positions.length - 1, Math.max(0, Math.max(current, 0) + step)));
  }

  return (
    <Fill
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      onKeyUp={() => hold.end()}
      {...groupProps}
    >
      {positions.map((id, index) => {
        const box = boxes[index];
        if (box === undefined) return null;
        const spring = isSpring(id);
        const checked = index === current;
        return (
          <button
            key={id}
            ref={(element) => {
              targets.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={labels[id] ?? id}
            tabIndex={checked || (current < 0 && index === 0) ? 0 : -1}
            className="pk-hit"
            style={hitStyle(box)}
            {...(spring
              ? hold.handlers(() => onPress(id))
              : {
                  onClick: (event: MouseEvent<HTMLButtonElement>) => {
                    if (pointerHandled && event.detail !== 0) return;
                    onSet(id);
                  },
                })}
          />
        );
      })}
    </Fill>
  );
}

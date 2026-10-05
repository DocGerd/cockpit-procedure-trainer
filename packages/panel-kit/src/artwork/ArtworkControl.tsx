import type { ControlPosition, Point } from '@cpt/core';
import { useRef } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import type { ControlWidgetProps } from '../types';
import { ArtworkStage } from './ArtworkStage';
import type { Artwork, Size } from './ArtworkStage';
import { fractionNear } from './geometry';

export type ArtworkControlProps = ControlWidgetProps & {
  artwork: Artwork;
  fallback: ReactNode;
};

const LEVER_STEP = 0.1;
const inputClass = 'cpt-artwork-input';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function nextPosition(positions: readonly string[], current: ControlPosition): string | undefined {
  const index = positions.indexOf(String(current));
  return positions[(index + 1) % positions.length];
}

function DiscreteInput({
  positions,
  guarded,
  position,
  guardOpen,
  label,
  positionLabels,
  onSet,
  onOpenGuard,
  onCloseGuard,
}: Pick<
  ControlWidgetProps,
  'position' | 'guardOpen' | 'label' | 'positionLabels' | 'onSet' | 'onOpenGuard' | 'onCloseGuard'
> & { positions: readonly string[]; guarded: boolean }) {
  const shown = positionLabels[String(position)] ?? String(position);
  return (
    <button
      type="button"
      className={inputClass}
      aria-label={`${label}: ${shown}`}
      onClick={() => {
        if (guarded && !guardOpen) return onOpenGuard();
        const next = nextPosition(positions, position);
        if (next !== undefined) onSet(next);
      }}
      onKeyDown={(event) => {
        if (guarded && guardOpen && event.key === 'Escape') onCloseGuard();
      }}
    />
  );
}

function MomentaryInput({
  position,
  label,
  held,
  onPress,
  onRelease,
}: Pick<ControlWidgetProps, 'position' | 'label' | 'onPress' | 'onRelease'> & { held: string }) {
  const pressed = useRef(false);
  const press = () => {
    if (pressed.current) return;
    pressed.current = true;
    onPress();
  };
  const release = () => {
    if (!pressed.current) return;
    pressed.current = false;
    onRelease();
  };
  const isActivation = (event: KeyboardEvent) => event.key === ' ' || event.key === 'Enter';
  return (
    <button
      type="button"
      className={inputClass}
      aria-label={label}
      aria-pressed={position === held}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        press();
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onKeyDown={(event) => {
        if (isActivation(event)) press();
      }}
      onKeyUp={(event) => {
        if (isActivation(event)) release();
      }}
      onBlur={release}
    />
  );
}

function LeverInput({
  position,
  label,
  path,
  size,
  onSet,
}: Pick<ControlWidgetProps, 'position' | 'label' | 'onSet'> & {
  path: readonly Point[] | undefined;
  size: Size | null;
}) {
  const dragging = useRef(false);
  const value = typeof position === 'number' ? position : 0;
  const drag = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!path || !size || rect.width === 0 || rect.height === 0) return;
    onSet(
      fractionNear(path, {
        x: ((event.clientX - rect.left) / rect.width) * size.width,
        y: ((event.clientY - rect.top) / rect.height) * size.height,
      }),
    );
  };
  const step = (delta: number) => onSet(clamp01(Math.round((value + delta) * 1000) / 1000));
  return (
    <div
      role="slider"
      tabIndex={0}
      className={inputClass}
      data-drag={path ? '' : undefined}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={value}
      onPointerDown={(event) => {
        if (!path) return;
        dragging.current = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        drag(event);
      }}
      onPointerMove={(event) => {
        if (dragging.current) drag(event);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      onKeyDown={(event) => {
        const keys: Record<string, () => void> = {
          ArrowUp: () => step(LEVER_STEP),
          ArrowRight: () => step(LEVER_STEP),
          ArrowDown: () => step(-LEVER_STEP),
          ArrowLeft: () => step(-LEVER_STEP),
          Home: () => onSet(0),
          End: () => onSet(1),
        };
        const handler = keys[event.key];
        if (!handler) return;
        event.preventDefault();
        handler();
      }}
    />
  );
}

export function ArtworkControl(props: ArtworkControlProps) {
  const { control, position, label, artwork, fallback } = props;
  const notches = typeof control.positions === 'string' ? undefined : control.positions;
  const travelPath = artwork.moving.type === 'travel' ? artwork.moving.path : undefined;

  const input = (size: Size | null): ReactNode => {
    if (control.kind === 'momentary') {
      return (
        <MomentaryInput
          position={position}
          label={label}
          held={control.positions[1]}
          onPress={props.onPress}
          onRelease={props.onRelease}
        />
      );
    }
    if (typeof control.positions === 'string') {
      return (
        <LeverInput
          position={position}
          label={label}
          path={travelPath}
          size={size}
          onSet={props.onSet}
        />
      );
    }
    return (
      <DiscreteInput
        {...props}
        positions={control.positions}
        guarded={control.kind === 'guarded'}
      />
    );
  };

  return (
    <ArtworkStage
      artwork={artwork}
      value={position}
      notches={notches}
      fallback={fallback}
      renderInput={input}
    />
  );
}

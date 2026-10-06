import type { ControlPosition, Point } from '@cpt/core';
import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode, RefObject } from 'react';
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

const noop = () => {};
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function nextPosition(positions: readonly string[], current: ControlPosition): string | undefined {
  const index = positions.indexOf(String(current));
  return positions[(index + 1) % positions.length];
}

type Hold = { position?: string };

function ButtonInput({
  name,
  hold,
  pressedState,
  id,
  className = inputClass,
  inputRef,
  onActivate,
  onEscape,
  onPress,
  onRelease,
}: Pick<ControlWidgetProps, 'onPress' | 'onRelease'> & {
  name: string;
  hold: Hold | undefined;
  pressedState?: boolean;
  id?: string;
  className?: string;
  inputRef?: RefObject<HTMLButtonElement | null>;
  onActivate: () => void;
  onEscape?: () => void;
}) {
  const pressed = useRef(false);
  const swallowClick = useRef(false);
  const press = () => {
    if (pressed.current || !hold) return;
    pressed.current = true;
    if (hold.position === undefined) onPress();
    else onPress(hold.position);
  };
  const release = () => {
    if (!pressed.current) return;
    pressed.current = false;
    onRelease();
  };
  const isActivation = (event: KeyboardEvent) => event.key === ' ' || event.key === 'Enter';
  const latestRelease = useRef(onRelease);
  latestRelease.current = onRelease;
  useEffect(
    () => () => {
      if (pressed.current) latestRelease.current();
    },
    [],
  );
  return (
    <button
      ref={inputRef}
      id={id}
      type="button"
      className={className}
      aria-label={name}
      aria-pressed={pressedState}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        swallowClick.current = hold !== undefined;
        press();
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onClick={() => {
        // A click while held is a key repeat; the hold ends on key up, not here.
        if (pressed.current) return;
        if (swallowClick.current) {
          swallowClick.current = false;
        } else if (hold) {
          press();
          release();
        } else {
          onActivate();
        }
      }}
      onKeyDown={(event) => {
        if (isActivation(event)) {
          // A held key steps or presses once; a hold also takes the key's own click.
          if (event.repeat || hold) event.preventDefault();
          if (event.repeat || !hold) return;
          press();
        } else if (event.key === 'Escape') {
          onEscape?.();
        }
      }}
      onKeyUp={(event) => {
        if (!isActivation(event) || !hold) return;
        // Cancels Space's click on key up; Enter's on key down is cancelled above.
        event.preventDefault();
        swallowClick.current = false;
        release();
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
      style={path ? { touchAction: 'none' } : undefined}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={value}
      aria-valuetext={`${Math.round(value * 100)}%`}
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

function GuardedInputs({
  label,
  handleName,
  guardOpen,
  onSet,
  onOpenGuard,
  onCloseGuard,
  onPress,
  onRelease,
}: Pick<
  ControlWidgetProps,
  'label' | 'guardOpen' | 'onOpenGuard' | 'onCloseGuard' | 'onPress' | 'onRelease'
> & { handleName: string; onSet: () => void }) {
  const guard = useRef<HTMLButtonElement>(null);
  const handle = useRef<HTMLButtonElement>(null);
  const handleId = useId();

  useEffect(() => {
    if (guardOpen && document.activeElement === guard.current) handle.current?.focus();
  }, [guardOpen]);

  const close = () => {
    guard.current?.focus();
    onCloseGuard();
  };

  return (
    <>
      <button
        ref={guard}
        type="button"
        className={`${inputClass} cpt-artwork-guard`}
        aria-label={label}
        aria-expanded={guardOpen}
        aria-controls={guardOpen ? handleId : undefined}
        onClick={guardOpen ? onCloseGuard : onOpenGuard}
        onKeyDown={(event) => {
          if (guardOpen && event.key === 'Escape') close();
        }}
      />
      {guardOpen && (
        <ButtonInput
          id={handleId}
          name={handleName}
          hold={undefined}
          className={`${inputClass} cpt-artwork-handle`}
          inputRef={handle}
          onActivate={onSet}
          onEscape={close}
          onPress={onPress}
          onRelease={onRelease}
        />
      )}
    </>
  );
}

export function ArtworkControl(props: ArtworkControlProps) {
  const { control, position, label, artwork, fallback } = props;
  const notches = typeof control.positions === 'string' ? undefined : control.positions;
  const travelPath = artwork.moving.type === 'travel' ? artwork.moving.path : undefined;

  const input = (size: Size | null): ReactNode => {
    if (control.kind === 'momentary') {
      return (
        <ButtonInput
          name={label}
          hold={{}}
          pressedState={position === control.positions[1]}
          onActivate={noop}
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
    const next = nextPosition(control.positions, position);
    const shown = props.positionLabels[String(position)] ?? String(position);
    if (control.kind === 'guarded') {
      return (
        <GuardedInputs
          label={label}
          handleName={`${label}: ${shown}`}
          guardOpen={props.guardOpen}
          onSet={() => {
            if (next !== undefined) props.onSet(next);
          }}
          onOpenGuard={props.onOpenGuard}
          onCloseGuard={props.onCloseGuard}
          onPress={props.onPress}
          onRelease={props.onRelease}
        />
      );
    }
    const springBack = control.kind === 'rotary' ? control.springBack : undefined;
    const isSpring = (id: string) => springBack !== undefined && Object.hasOwn(springBack, id);
    const current = String(position);
    // Spring detents are held, never stepped onto, so the cycle runs past them to every other position.
    const cycle = nextPosition(
      control.positions.filter((id) => !isSpring(id)),
      position,
    );
    const spring = isSpring(current)
      ? current
      : control.positions.find((id) => isSpring(id) && springBack?.[id] === current);
    const cycleInput = (
      <ButtonInput
        name={`${label}: ${shown}`}
        hold={undefined}
        {...(spring === undefined ? {} : { className: `${inputClass} cpt-artwork-cycle` })}
        onActivate={() => {
          if (cycle !== undefined && cycle !== current) props.onSet(cycle);
        }}
        onPress={props.onPress}
        onRelease={props.onRelease}
      />
    );
    if (spring === undefined) return cycleInput;
    return (
      <>
        {cycleInput}
        <ButtonInput
          name={`${label}: ${props.positionLabels[spring] ?? spring}`}
          hold={{ position: spring }}
          className={`${inputClass} cpt-artwork-spring`}
          onActivate={noop}
          onPress={props.onPress}
          onRelease={props.onRelease}
        />
      </>
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

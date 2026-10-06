import type { ControlPosition, Point } from '@cpt/core';
import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent, ReactNode, RefObject } from 'react';
import type { ControlWidgetProps } from '../types';
import { ArtworkStage } from './ArtworkStage';
import type { Artwork, Size } from './ArtworkStage';
import { fractionNear, layerFraction } from './geometry';

export type ArtworkControlProps = ControlWidgetProps & {
  artwork: Artwork;
  fallback: ReactNode;
};

const LEVER_STEP = 0.1;
const DEAD_ZONE = 0.2;
const inputClass = 'cpt-artwork-input';

const noop = () => {};
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function nextPosition(positions: readonly string[], current: ControlPosition): string | undefined {
  const index = positions.indexOf(String(current));
  return positions[(index + 1) % positions.length];
}

// Up and Right step toward the end of the path drawn higher or further right.
function forwardSign(path: readonly Point[] | undefined): 1 | -1 {
  const first = path?.[0];
  const last = path?.[path.length - 1];
  if (!first || !last) return 1;
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  return (Math.abs(dy) >= Math.abs(dx) ? dy < 0 : dx > 0) ? 1 : -1;
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
  onReleased,
}: Pick<ControlWidgetProps, 'onPress' | 'onRelease'> & {
  name: string;
  hold: Hold | undefined;
  pressedState?: boolean;
  id?: string;
  className?: string;
  inputRef?: RefObject<HTMLButtonElement | null>;
  onActivate: () => void;
  onEscape?: () => void;
  onReleased?: () => void;
}) {
  const pressed = useRef(false);
  const swallowClick = useRef(false);
  const press = () => {
    if (pressed.current || !hold) return;
    pressed.current = true;
    if (hold.position === undefined) onPress();
    else onPress(hold.position);
  };
  const release = (ended = false) => {
    if (!pressed.current) return;
    pressed.current = false;
    onRelease();
    if (ended) onReleased?.();
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
      onPointerUp={() => release(true)}
      onPointerCancel={() => release(true)}
      onClick={() => {
        // A click while held is a key repeat; the hold ends on key up, not here.
        if (pressed.current) return;
        if (swallowClick.current) {
          swallowClick.current = false;
        } else if (hold) {
          press();
          release(true);
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
        release(true);
      }}
      onBlur={() => release()}
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
  const forward = forwardSign(path);
  const drawn = forward === 1 ? value : 1 - value;
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
      aria-valuenow={drawn}
      aria-valuetext={`${Math.round(drawn * 100)}%`}
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
          ArrowUp: () => step(forward * LEVER_STEP),
          ArrowRight: () => step(forward * LEVER_STEP),
          ArrowDown: () => step(-forward * LEVER_STEP),
          ArrowLeft: () => step(-forward * LEVER_STEP),
          Home: () => onSet(forward === 1 ? 0 : 1),
          End: () => onSet(forward === 1 ? 1 : 0),
        };
        const handler = keys[event.key];
        if (!handler) return;
        event.preventDefault();
        handler();
      }}
    />
  );
}

function NotchInput({
  steps,
  index,
  label,
  valueText,
  path,
  size,
  notches,
  position,
  className,
  rotary,
  inputRef,
  onSet,
}: Pick<ControlWidgetProps, 'onSet'> & {
  steps: readonly string[];
  index: number;
  label: string;
  valueText: string;
  path: readonly Point[] | undefined;
  size: Size | null;
  notches: readonly string[] | undefined;
  position: ControlPosition;
  className?: string;
  rotary: boolean;
  inputRef: RefObject<HTMLDivElement | null>;
}) {
  const forward = forwardSign(path);
  const goTo = (target: number) => {
    const id = steps[Math.min(steps.length - 1, Math.max(0, target))];
    if (id !== undefined && id !== String(position)) onSet(id);
  };
  const tap = (event: MouseEvent<HTMLDivElement>) => {
    if (event.detail === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const current = layerFraction(position, notches);
    let direction: number;
    if (path && size && !Number.isNaN(current)) {
      const near = fractionNear(path, {
        x: (x / rect.width) * size.width,
        y: (y / rect.height) * size.height,
      });
      const delta = near - current;
      const zone = DEAD_ZONE / Math.max(1, notches ? notches.length - 1 : 1);
      direction = Math.abs(delta) < zone ? 0 : Math.sign(delta);
    } else if (rotary || rect.width >= rect.height * 0.8) {
      const off = x - rect.width / 2;
      direction = Math.abs(off) < rect.width * DEAD_ZONE ? 0 : Math.sign(off);
    } else {
      const off = rect.height / 2 - y;
      direction = Math.abs(off) < rect.height * DEAD_ZONE ? 0 : Math.sign(off);
    }
    if (direction !== 0) goTo(index + direction);
  };
  return (
    <div
      ref={inputRef}
      role="slider"
      tabIndex={0}
      className={className ?? inputClass}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={steps.length - 1}
      aria-valuenow={forward === 1 ? index : steps.length - 1 - index}
      aria-valuetext={valueText}
      onClick={tap}
      onKeyDown={(event) => {
        const keys: Record<string, () => void> = {
          ArrowUp: () => goTo(index + forward),
          ArrowRight: () => goTo(index + forward),
          ArrowDown: () => goTo(index - forward),
          ArrowLeft: () => goTo(index - forward),
          Home: () => goTo(forward === 1 ? 0 : steps.length - 1),
          End: () => goTo(forward === 1 ? steps.length - 1 : 0),
          Enter: noop,
          ' ': noop,
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
  const slider = useRef<HTMLDivElement>(null);
  const cycle = useRef<HTMLButtonElement>(null);
  const refocus = () => (slider.current ?? cycle.current)?.focus();

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
    // Spring detents are held, never stepped onto, so stepping runs over the other positions only.
    const steps = control.positions.filter((id) => !isSpring(id));
    const spring = isSpring(current)
      ? current
      : control.positions.find((id) => isSpring(id) && springBack?.[id] === current);
    const resting = isSpring(current) ? (springBack?.[current] ?? current) : current;
    const stepIndex = Math.max(0, steps.indexOf(resting));
    const springClass = spring === undefined ? undefined : `${inputClass} cpt-artwork-cycle`;
    const cycleInput =
      steps.length > 2 ? (
        <NotchInput
          steps={steps}
          index={stepIndex}
          label={label}
          valueText={shown}
          path={travelPath}
          size={size}
          notches={notches}
          position={position}
          rotary={control.kind === 'rotary'}
          inputRef={slider}
          {...(springClass === undefined ? {} : { className: springClass })}
          onSet={props.onSet}
        />
      ) : (
        <ButtonInput
          name={`${label}: ${shown}`}
          hold={undefined}
          inputRef={cycle}
          {...(springClass === undefined ? {} : { className: springClass })}
          onActivate={() => {
            const cycle = nextPosition(steps, resting);
            if (cycle !== undefined && cycle !== current) props.onSet(cycle);
          }}
          onPress={props.onPress}
          onRelease={props.onRelease}
        />
      );
    if (!control.positions.some(isSpring)) return cycleInput;
    return (
      <>
        {cycleInput}
        {spring !== undefined && (
          <ButtonInput
            name={`${label}: ${props.positionLabels[spring] ?? spring}`}
            hold={{ position: spring }}
            className={`${inputClass} cpt-artwork-spring`}
            onActivate={noop}
            onReleased={refocus}
            onPress={props.onPress}
            onRelease={props.onRelease}
          />
        )}
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

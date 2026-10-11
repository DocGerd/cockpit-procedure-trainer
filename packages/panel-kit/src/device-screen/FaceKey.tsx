import type { CSSProperties } from 'react';
import { useHold } from '../controls/use-hold';
import type { DeviceScreenProps } from '../types';
import { percent } from './percent';
import './styles';

/** A step of the type scale with a matching leading token. */
export type FaceTextSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg';

export type FaceKeyProps = {
  /** The legend the unit prints above the key; also its accessible name unless `name` is given. */
  legend: string;
  name?: string | undefined;
  control: string;
  /** The position the key stands for; absent when it stands for its whole control. */
  position?: string | undefined;
  /** The drawn cap's centre, in fractions of the face's width (x) and height (y). */
  cap: { x: number; y: number };
  /** The cap's diameter, in fractions of the face width. */
  capSize: number;
  /** From the legend's centre down to the cap's centre, in fractions of the face height. */
  legendGap: number;
  /** The face's width over its height; 1 for a round unit. */
  aspect?: number | undefined;
  legendSize?: FaceTextSize | undefined;
  send: DeviceScreenProps['send'];
};

/**
 * One touch target over a printed legend and the round cap below it, placed in the face that
 * contains it (positioned, at the face's size). The device's art draws the cap; the key marks it
 * while pressed.
 */
export function FaceKey({
  legend,
  name,
  control,
  position,
  cap,
  capSize,
  legendGap,
  aspect = 1,
  legendSize = 'xs',
  send,
}: FaceKeyProps) {
  const hold = useHold(() => send(control, 'release'));
  const press = () =>
    position === undefined ? send(control, 'press') : send(control, 'press', position);
  const leading = `var(--leading-${legendSize})`;
  const capHalfHeight = (capSize * aspect) / 2;

  const keyStyle: CSSProperties = {
    left: percent(cap.x),
    top: `calc(${percent(cap.y - legendGap)} - ${leading} / 2)`,
    width: percent(capSize),
    height: `calc(${percent(legendGap + capHalfHeight)} + ${leading} / 2)`,
    minWidth: 'var(--size-target)',
    minHeight: 'var(--size-target)',
    fontSize: `var(--text-${legendSize})`,
    lineHeight: leading,
  };
  const capStyle: CSSProperties = {
    left: percent(cap.x),
    top: percent(cap.y),
    width: percent(capSize),
  };

  return (
    <>
      <button
        type="button"
        className="pk-face-key"
        aria-label={name}
        data-control={control}
        data-position={position}
        style={keyStyle}
        {...hold.handlers(press)}
      >
        {legend}
      </button>
      <span className="pk-face-key-cap" data-face-key-cap aria-hidden="true" style={capStyle} />
    </>
  );
}

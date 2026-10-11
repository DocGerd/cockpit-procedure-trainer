import type { CSSProperties, ReactNode } from 'react';
import type { DeviceFace } from '../types';
import { useContainScale } from './fit';
import { percent } from './percent';
import './styles';

/** The mirror's natural size: a token width and the aspect of the slot it is drawn for, bezel included. */
export type MirrorSize = { width: string; aspectRatio: string };

/** A 520 by 150 unit radio or transponder mirror. */
export const RADIO_MIRROR: MirrorSize = {
  width: 'calc(var(--space-12) * 10 + var(--space-10))',
  aspectRatio: '520 / 150',
};

/** A 400 by 300 unit GPS mirror. */
export const GPS_MIRROR: MirrorSize = {
  width: 'calc(var(--space-12) * 8 + var(--space-4))',
  aspectRatio: '400 / 300',
};

/** Where an own face prints its label: the label's centre, in fractions of the mirror's width and height. */
export type MirrorLabelAt = {
  left: number;
  top: number;
  /** Letters stacked upright, one over the next. */
  vertical?: boolean | undefined;
};

export type DeviceDisplayFrameProps = {
  on: boolean;
  size: MirrorSize;
  /** The unit's face word or name, printed on the bezel. */
  label: string;
  /** `own`: no bezel, label column, glass or off scrim; the device draws its face in the whole box. */
  face?: DeviceFace | undefined;
  /** Where an own face prints the label; a framed mirror prints it in its label column. */
  labelAt?: MirrorLabelAt | undefined;
  children: ReactNode;
};

const DEFAULT_LABEL_AT: MirrorLabelAt = { left: 0.5, top: 0.1 };

function OwnFace({
  label,
  labelAt,
  children,
}: {
  label: string;
  labelAt: MirrorLabelAt;
  children: ReactNode;
}) {
  return (
    <>
      <div className="pk-mirror-face">{children}</div>
      <span
        className="pk-mirror-label"
        data-mirror-label
        data-vertical={labelAt.vertical ? '' : undefined}
        style={{ left: percent(labelAt.left), top: percent(labelAt.top) }}
      >
        {label}
      </span>
    </>
  );
}

/** A read-only mirror of a device: bezel and display scale together to fill the slot. */
export function DeviceDisplayFrame({
  on,
  size,
  label,
  face,
  labelAt = DEFAULT_LABEL_AT,
  children,
}: DeviceDisplayFrameProps) {
  const [boxRef, contentRef, scale] = useContainScale();
  const own = face === 'own';
  return (
    <div
      className="pk-mirror"
      data-device-mirror
      data-on={on}
      data-face={own ? 'own' : undefined}
      ref={boxRef}
    >
      <div
        className="pk-mirror-content"
        ref={contentRef}
        data-scale={scale}
        style={{ '--pk-device-scale': scale } as CSSProperties}
      >
        <div className="pk-mirror-bezel" style={size}>
          {own ? (
            <OwnFace label={label} labelAt={labelAt}>
              {children}
            </OwnFace>
          ) : (
            <>
              <span className="pk-mirror-label" data-mirror-label>
                {label}
              </span>
              <div className="pk-mirror-screen">
                {children}
                {!on && <div className="pk-device-off" data-screen-off aria-hidden="true" />}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

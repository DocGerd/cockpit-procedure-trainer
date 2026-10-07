import type { CSSProperties, ReactNode } from 'react';
import { useContainScale } from './fit';
import './styles';

/** The mirror's natural size: a token width and the aspect of the slot it is drawn for, bezel included. */
export type MirrorSize = { width: string; aspectRatio: string };

/** Radio and transponder slots are 520 by 150 units. */
export const RADIO_MIRROR: MirrorSize = {
  width: 'calc(var(--space-12) * 10 + var(--space-10))',
  aspectRatio: '520 / 150',
};

/** The GPS slot is 400 by 300 units. */
export const GPS_MIRROR: MirrorSize = {
  width: 'calc(var(--space-12) * 8 + var(--space-4))',
  aspectRatio: '400 / 300',
};

export type DeviceDisplayFrameProps = {
  on: boolean;
  size: MirrorSize;
  /** The unit name, printed on the bezel. */
  label: string;
  children: ReactNode;
};

/** A read-only mirror of a device: bezel and display scale together to fill the slot. */
export function DeviceDisplayFrame({ on, size, label, children }: DeviceDisplayFrameProps) {
  const [boxRef, contentRef, scale] = useContainScale();
  return (
    <div className="pk-mirror" data-device-mirror data-on={on} ref={boxRef}>
      <div
        className="pk-mirror-content"
        ref={contentRef}
        data-scale={scale}
        style={{ '--pk-device-scale': scale } as CSSProperties}
      >
        <div className="pk-mirror-bezel" style={size}>
          <span className="pk-mirror-label" data-mirror-label>
            {label}
          </span>
          <div className="pk-mirror-screen">
            {children}
            {!on && <div className="pk-device-off" data-screen-off aria-hidden="true" />}
          </div>
        </div>
      </div>
    </div>
  );
}

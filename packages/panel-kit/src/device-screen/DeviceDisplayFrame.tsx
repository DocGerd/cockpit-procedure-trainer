import type { CSSProperties, ReactNode } from 'react';
import { useContainScale } from './fit';
import './styles';

export type DeviceDisplayFrameProps = {
  on: boolean;
  /** The unit name, printed on the bezel. */
  label: string;
  children: ReactNode;
};

/** A read-only mirror of a device: bezel and display scale together to fill the slot. */
export function DeviceDisplayFrame({ on, label, children }: DeviceDisplayFrameProps) {
  const [boxRef, contentRef, scale] = useContainScale();
  return (
    <div className="pk-mirror" data-device-mirror data-on={on} ref={boxRef}>
      <div
        className="pk-mirror-content"
        ref={contentRef}
        data-scale={scale}
        style={{ '--pk-device-scale': scale } as CSSProperties}
      >
        <div className="pk-mirror-bezel">
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

import type { CSSProperties, ReactNode } from 'react';
import { useContainScale } from './fit';
import './styles';

export type DeviceScreenFrameProps = {
  on: boolean;
  label: string;
  children: ReactNode;
};

export function DeviceScreenFrame({ on, label, children }: DeviceScreenFrameProps) {
  const [boxRef, contentRef, scale] = useContainScale();
  return (
    <div className="pk-device" role="group" aria-label={label} data-device-frame data-on={on}>
      <div className="pk-device-screen" ref={boxRef}>
        <div
          className="pk-device-content"
          ref={contentRef}
          data-scale={scale}
          style={{ '--pk-device-scale': scale } as CSSProperties}
        >
          {children}
        </div>
        {!on && <div className="pk-device-off" data-screen-off aria-hidden="true" />}
      </div>
    </div>
  );
}

import type { CSSProperties, ReactNode } from 'react';
import type { DeviceFace } from '../types';
import { useContainScale } from './fit';
import './styles';

export type DeviceScreenFrameProps = {
  on: boolean;
  label: string;
  /** `own`: no bezel, glass, keycaps or off scrim; the device draws its face on bare panel metal. */
  face?: DeviceFace | undefined;
  children: ReactNode;
};

export function DeviceScreenFrame({ on, label, face, children }: DeviceScreenFrameProps) {
  const [boxRef, contentRef, scale] = useContainScale();
  const own = face === 'own';
  return (
    <div
      className="pk-device"
      role="group"
      aria-label={label}
      data-device-frame
      data-on={on}
      data-face={own ? 'own' : undefined}
    >
      <div className="pk-device-screen" ref={boxRef}>
        <div
          className={own ? 'pk-face-content' : 'pk-device-content'}
          ref={contentRef}
          data-scale={scale}
          style={{ '--pk-device-scale': scale } as CSSProperties}
        >
          {children}
        </div>
        {!on && !own && <div className="pk-device-off" data-screen-off aria-hidden="true" />}
      </div>
    </div>
  );
}

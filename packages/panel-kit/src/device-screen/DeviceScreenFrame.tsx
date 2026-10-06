import type { ReactNode } from 'react';
import './styles';

export type DeviceScreenFrameProps = {
  on: boolean;
  label: string;
  children: ReactNode;
};

export function DeviceScreenFrame({ on, label, children }: DeviceScreenFrameProps) {
  return (
    <div className="pk-device" role="group" aria-label={label} data-device-frame data-on={on}>
      <div className="pk-device-screen">
        {children}
        {!on && <div className="pk-device-off" data-screen-off aria-hidden="true" />}
      </div>
    </div>
  );
}

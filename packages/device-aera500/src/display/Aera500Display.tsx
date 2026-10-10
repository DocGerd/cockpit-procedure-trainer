import { DeviceDisplayFrame } from '@cpt/panel-kit';
import type { DeviceDisplayProps, MirrorSize } from '@cpt/panel-kit';
import type { Aera500State } from '../logic';
import { AeraFace } from '../screen/AeraFace';

/** The aera 500 mirror: the 8:5 landscape window with its bezel. */
export const AERA500_MIRROR: MirrorSize = {
  width: 'calc(var(--space-12) * 8 + var(--space-4))',
  aspectRatio: '8 / 5',
};

export function Aera500Display({ on, state }: DeviceDisplayProps) {
  const unit = state as Aera500State;
  return (
    <DeviceDisplayFrame on={on} size={AERA500_MIRROR} label="GPS">
      <AeraFace state={unit} lit={on && unit.on} compact />
    </DeviceDisplayFrame>
  );
}

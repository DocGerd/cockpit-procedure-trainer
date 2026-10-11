import { DeviceDisplayFrame } from '@cpt/panel-kit';
import type { DeviceDisplayProps, MirrorLabelAt, MirrorSize } from '@cpt/panel-kit';
import { AeraFace } from '../face/AeraFace';
import { FACE, LABEL_AT } from '../face/geometry';
import type { Aera500State } from '../logic';

/** The aera 500 mirror: the 8:5 slot, holding the cradle with its rail at full height. */
export const AERA500_MIRROR: MirrorSize = {
  width: 'calc(var(--space-12) * 8 + var(--space-4))',
  aspectRatio: '8 / 5',
};

/** GPS in the body's bottom band, clear of the maker's lettering (D21). */
const LABEL: MirrorLabelAt = { left: 0.5, top: LABEL_AT.y / FACE.height };

export function Aera500Display({ on, state }: DeviceDisplayProps) {
  const unit = state as Aera500State;
  return (
    <DeviceDisplayFrame on={on} size={AERA500_MIRROR} label="GPS" face="own" labelAt={LABEL}>
      <AeraFace mode="mirror" state={unit} lit={on && unit.on} />
    </DeviceDisplayFrame>
  );
}

import { DeviceDisplayFrame } from '@cpt/panel-kit';
import type { DeviceDisplayProps, MirrorLabelAt, MirrorSize } from '@cpt/panel-kit';
import { AtcFace } from '../face/AtcFace';
import { LABEL } from '../face/geometry';
import type { Trt800hState } from '../logic';

/** The unit box is the disc's bounding square: the slot is drawn 1:1. */
export const ROUND_MIRROR: MirrorSize = {
  width: 'calc(var(--space-12) * 5 + var(--space-8))',
  aspectRatio: '1 / 1',
};

const LABEL_AT: MirrorLabelAt = {
  left: LABEL.x,
  top: (LABEL.top + LABEL.bottom) / 2,
  vertical: true,
};

export function Trt800hDisplay({ on, state }: DeviceDisplayProps) {
  return (
    <DeviceDisplayFrame on={on} size={ROUND_MIRROR} label="ATC" face="own" labelAt={LABEL_AT}>
      <AtcFace mode="mirror" state={state as Trt800hState} on={on} />
    </DeviceDisplayFrame>
  );
}

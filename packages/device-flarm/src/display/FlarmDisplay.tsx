import { DeviceDisplayFrame } from '@cpt/panel-kit';
import type { DeviceDisplayProps, MirrorSize } from '@cpt/panel-kit';
import { FlarmFace } from '../face/FlarmFace';
import { WORDMARK, mirrorX } from '../face/geometry';
import type { FlarmState } from '../logic';

/** The mirror of the FLARM slot: twice as wide as tall, with the face centred in it. */
export const FLARM_MIRROR: MirrorSize = {
  width: 'calc(var(--space-12) * 6 + var(--space-8))',
  aspectRatio: '2 / 1',
};

const LABEL_AT = { left: mirrorX(WORDMARK.x), top: WORDMARK.y };

export function FlarmDisplay({ on, state }: DeviceDisplayProps) {
  return (
    <DeviceDisplayFrame on={on} size={FLARM_MIRROR} label="FLARM" face="own" labelAt={LABEL_AT}>
      <FlarmFace mode="mirror" on={on} state={state as FlarmState} />
    </DeviceDisplayFrame>
  );
}

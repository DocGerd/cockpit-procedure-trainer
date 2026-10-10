import { DeviceDisplayFrame } from '@cpt/panel-kit';
import type { DeviceDisplayProps, MirrorSize } from '@cpt/panel-kit';
import { FlarmFace } from '../face/FlarmFace';
import type { FlarmState } from '../logic';

/** The FLARM slot is 320 by 160 units. */
export const FLARM_MIRROR: MirrorSize = {
  width: 'calc(var(--space-12) * 6 + var(--space-8))',
  aspectRatio: '2 / 1',
};

export function FlarmDisplay({ on, state }: DeviceDisplayProps) {
  return (
    <DeviceDisplayFrame on={on} size={FLARM_MIRROR} label="FLARM">
      <FlarmFace on={on} state={state as FlarmState} size="var(--text-2xl)" />
    </DeviceDisplayFrame>
  );
}

import { DeviceDisplayFrame } from '@cpt/panel-kit';
import type { DeviceDisplayProps, MirrorSize } from '@cpt/panel-kit';
import { Atr833Face } from '../face/Atr833Face';
import { COM_LABEL, MIRROR_DIAMETER } from '../face/geometry';
import type { Atr833State } from '../logic';

export const ATR833_MIRROR: MirrorSize = { width: MIRROR_DIAMETER, aspectRatio: '1 / 1' };

const LABEL_AT = {
  left: COM_LABEL.x,
  top: (COM_LABEL.top + COM_LABEL.bottom) / 2,
  vertical: true,
};

export function Atr833Display({ on, state }: DeviceDisplayProps) {
  return (
    <DeviceDisplayFrame on={on} size={ATR833_MIRROR} label="COM" face="own" labelAt={LABEL_AT}>
      <Atr833Face mode="mirror" diameter={MIRROR_DIAMETER} on={on} state={state as Atr833State} />
    </DeviceDisplayFrame>
  );
}

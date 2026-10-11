import { KnobHelpers } from '@cpt/panel-kit';
import type { DeviceScreenProps } from '@cpt/panel-kit';
import type { CSSProperties } from 'react';
import { AtcFace } from '../face/AtcFace';
import type { Trt800hState } from '../logic';

// The knob is too small to turn by finger: its helpers stand on the panel metal right of it,
// ending level with the bottom of the unit box as the knob does.
const screenStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto auto',
  alignItems: 'end',
  columnGap: 'var(--space-2)',
};

export function Trt800hScreen({ on, state, send }: DeviceScreenProps) {
  return (
    <div className="cpt-device-trt800h" style={screenStyle}>
      <AtcFace mode="dock" state={state as Trt800hState} on={on} send={send} />
      <KnobHelpers word="CODE" control="knob" send={send} />
    </div>
  );
}

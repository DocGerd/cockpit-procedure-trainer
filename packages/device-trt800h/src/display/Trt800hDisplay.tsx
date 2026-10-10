import { DeviceDisplayFrame } from '@cpt/panel-kit';
import type { DeviceDisplayProps, MirrorSize } from '@cpt/panel-kit';
import type { CSSProperties } from 'react';
import type { Trt800hState } from '../logic';
import { AtcFace } from '../screen/AtcFace';

/** The unit is square with a round face: the slot is drawn 1:1. */
export const ROUND_MIRROR: MirrorSize = {
  width: 'calc(var(--space-12) * 5 + var(--space-8))',
  aspectRatio: '1 / 1',
};

const windowStyle: CSSProperties = {
  position: 'relative',
  display: 'grid',
  placeItems: 'center',
  boxSizing: 'border-box',
  width: '100%',
  height: '100%',
  background: 'var(--panel-bezel-dark)',
};

const roundStyle: CSSProperties = {
  height: '100%',
  aspectRatio: '1 / 1',
  borderRadius: '50%',
  justifyContent: 'center',
};

const knobStyle: CSSProperties = {
  position: 'absolute',
  right: 'var(--space-1)',
  bottom: 'var(--space-1)',
  width: 'var(--space-10)',
  height: 'var(--space-10)',
  borderRadius: '50%',
  background: 'var(--panel-cap)',
  boxShadow: 'inset 0 0 0 var(--space-1) var(--panel-plastic-light)',
};

export function Trt800hDisplay({ on, state }: DeviceDisplayProps) {
  return (
    <DeviceDisplayFrame on={on} size={ROUND_MIRROR} label="ATC">
      <div style={windowStyle}>
        <AtcFace state={state as Trt800hState} on={on} size="mirror" style={roundStyle} />
        <span data-knob aria-hidden="true" style={knobStyle} />
      </div>
    </DeviceDisplayFrame>
  );
}

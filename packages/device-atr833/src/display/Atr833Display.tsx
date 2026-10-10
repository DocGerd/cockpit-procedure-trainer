import { DeviceDisplayFrame } from '@cpt/panel-kit';
import type { DeviceDisplayProps, MirrorSize } from '@cpt/panel-kit';
import type { CSSProperties } from 'react';
import { FaceLines } from '../face/FaceLines';
import type { Atr833State } from '../logic';

export const ATR833_MIRROR: MirrorSize = {
  width: 'calc(var(--space-12) * 5 + var(--space-8))',
  aspectRatio: '1 / 1',
};

const windowStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  width: '100%',
  height: '100%',
  background: 'var(--panel-screen)',
  overflow: 'hidden',
};

const faceStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  width: '100%',
  aspectRatio: '1 / 1',
  borderRadius: 'var(--radius-pill)',
  background: 'var(--panel-dial)',
};

const knobStyle: CSSProperties = {
  position: 'absolute',
  right: 0,
  width: 'var(--space-8)',
  height: 'var(--space-8)',
  borderRadius: 'var(--radius-pill)',
  background: 'var(--panel-plastic)',
  boxShadow: 'inset 0 0 0 var(--space-1) var(--panel-bezel-dark)',
};

export function Atr833Display({ on, state }: DeviceDisplayProps) {
  const unit = state as Atr833State;
  return (
    <DeviceDisplayFrame on={on} size={ATR833_MIRROR} label="COM">
      <div style={windowStyle}>
        <div style={faceStyle}>
          <FaceLines on={on} state={unit} />
        </div>
        <span aria-hidden="true" data-knob="volSel" style={{ ...knobStyle, top: 0 }} />
        <span aria-hidden="true" data-knob="freq" style={{ ...knobStyle, bottom: 0 }} />
      </div>
    </DeviceDisplayFrame>
  );
}

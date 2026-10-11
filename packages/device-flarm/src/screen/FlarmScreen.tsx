import { useHold } from '@cpt/panel-kit';
import type { DeviceScreenProps } from '@cpt/panel-kit';
import type { CSSProperties } from 'react';
import { FlarmFace } from '../face/FlarmFace';
import type { FlarmState } from '../logic';
import './FlarmScreen.css';

const screenStyle: CSSProperties = {
  display: 'grid',
  justifyItems: 'center',
  gap: 'var(--space-2)',
  padding: 'var(--space-2)',
  background: 'var(--panel-screen)',
  color: 'var(--panel-legend)',
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-md)',
  lineHeight: 'var(--leading-md)',
};

const windowStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: 'calc(var(--space-12) * 6 + var(--space-8))',
  height: 'calc(var(--space-12) * 4)',
};

const buttonStyle: CSSProperties = {
  minWidth: 'var(--size-target)',
  minHeight: 'var(--size-target)',
  padding: 'var(--space-2) var(--space-6)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--panel-bezel-dark)',
  color: 'var(--panel-legend)',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  cursor: 'pointer',
};

export function FlarmScreen({ on, state, send }: DeviceScreenProps) {
  const hold = useHold(() => send('mode', 'release'));
  return (
    <div className="cpt-device-flarm" style={screenStyle}>
      <div data-display style={windowStyle}>
        <FlarmFace on={on} state={state as FlarmState} size="var(--text-md)" sideWords />
      </div>
      <button
        type="button"
        style={buttonStyle}
        data-control="mode"
        {...hold.handlers(() => send('mode', 'press'))}
      >
        Mode
      </button>
    </div>
  );
}

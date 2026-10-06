import type { ControlPosition } from '@cpt/core';
import type { DeviceScreenProps } from '@cpt/panel-kit';
import type { CSSProperties } from 'react';
import { formatFrequency } from '../logic';
import type { ComState } from '../logic';
import './ComScreen.css';

const screenStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--space-2)',
  padding: 'var(--space-2)',
  background: 'var(--panel-screen)',
  color: 'var(--panel-legend)',
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-md)',
  lineHeight: 'var(--leading-md)',
};

const readoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  columnGap: 'var(--space-3)',
  alignItems: 'baseline',
  minHeight: 'var(--leading-3xl)',
};

const legendStyle: CSSProperties = { color: 'var(--panel-legend-muted)' };

const valueStyle: CSSProperties = {
  fontSize: 'var(--text-3xl)',
  lineHeight: 'var(--leading-3xl)',
  textAlign: 'right',
};

const rowStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' };

const buttonStyle: CSSProperties = {
  minWidth: 'var(--size-target)',
  minHeight: 'var(--size-target)',
  padding: 'var(--space-2) var(--space-3)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--panel-bezel-dark)',
  color: 'var(--panel-legend)',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  cursor: 'pointer',
};

const volumeStyle: CSSProperties = { flex: 1, minHeight: 'var(--size-target)' };

const volumeLabelStyle: CSSProperties = {
  ...legendStyle,
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
};

export function ComScreen({ on, state, send }: DeviceScreenProps) {
  const { active, standby, volume } = state as ComState;

  const click = (control: string, position?: ControlPosition) => () => {
    if (position === undefined) send(control, 'press');
    else send(control, 'press', position);
    send(control, 'release');
  };

  const button = (name: string, control: string, position?: ControlPosition) => (
    <button type="button" style={buttonStyle} onClick={click(control, position)}>
      {name}
    </button>
  );

  return (
    <div className="cpt-device-com" style={screenStyle}>
      <div style={readoutStyle}>
        <span style={legendStyle}>ACT</span>
        <span style={valueStyle}>{on ? formatFrequency(active) : ''}</span>
        <span style={legendStyle}>STBY</span>
        <span style={valueStyle}>{on ? formatFrequency(standby) : ''}</span>
      </div>
      <div style={rowStyle}>
        {button('STBY MHz −', 'coarse', 'down')}
        {button('STBY MHz +', 'coarse', 'up')}
        {button('STBY kHz −', 'fine', 'down')}
        {button('STBY kHz +', 'fine', 'up')}
      </div>
      <div style={rowStyle}>
        {button('SWAP', 'swap')}
        <label style={volumeLabelStyle}>
          <span>VOL</span>
          <input
            type="range"
            aria-label="VOL"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            style={volumeStyle}
            onChange={(event) => send('volume', 'set', Number(event.currentTarget.value))}
          />
        </label>
      </div>
    </div>
  );
}

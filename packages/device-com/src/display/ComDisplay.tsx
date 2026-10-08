import { RADIO_MIRROR, DeviceDisplayFrame } from '@cpt/panel-kit';
import type { DeviceDisplayProps } from '@cpt/panel-kit';
import type { CSSProperties } from 'react';
import { formatFrequency } from '../logic';
import type { ComState } from '../logic';

const PERCENT = 100;

const screenStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  alignContent: 'center',
  alignItems: 'baseline',
  columnGap: 'var(--space-4)',
  boxSizing: 'border-box',
  width: '100%',
  height: '100%',
  padding: 'var(--space-1)',
  background: 'var(--panel-screen)',
  color: 'var(--panel-legend)',
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-3xl)',
  lineHeight: 'var(--leading-3xl)',
};

const legendStyle: CSSProperties = {
  color: 'var(--panel-legend-muted)',
  fontSize: 'var(--text-2xl)',
  lineHeight: 'var(--leading-2xl)',
};

const valueStyle: CSSProperties = { textAlign: 'right' };

const smallValueStyle: CSSProperties = {
  ...valueStyle,
  fontSize: 'var(--text-2xl)',
  lineHeight: 'var(--leading-2xl)',
};

export function ComDisplay({ on, state }: DeviceDisplayProps) {
  const { active, standby, volume } = state as ComState;
  return (
    <DeviceDisplayFrame on={on} size={RADIO_MIRROR} label="COM">
      <div style={screenStyle}>
        <span style={legendStyle}>ACT</span>
        <span data-field="active" style={valueStyle}>
          {on ? formatFrequency(active) : ''}
        </span>
        <span style={legendStyle}>STBY</span>
        <span data-field="standby" style={valueStyle}>
          {on ? formatFrequency(standby) : ''}
        </span>
        <span style={legendStyle}>VOL</span>
        <span data-field="volume" style={smallValueStyle}>
          {on ? `${Math.round(volume * PERCENT)}%` : ''}
        </span>
      </div>
    </DeviceDisplayFrame>
  );
}

import { RADIO_MIRROR, DeviceDisplayFrame } from '@cpt/panel-kit';
import type { DeviceDisplayProps } from '@cpt/panel-kit';
import type { CSSProperties } from 'react';
import { codeText, readingText } from '../logic';
import type { Gtx327State } from '../logic';

const screenStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto 1fr auto',
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

const codeStyle: CSSProperties = { textAlign: 'center' };

const readingStyle: CSSProperties = { textAlign: 'right' };

const identStyle: CSSProperties = {
  gridColumn: '1 / -1',
  color: 'var(--panel-legend-muted)',
  fontSize: 'var(--text-2xl)',
  lineHeight: 'var(--leading-2xl)',
};

export function Gtx327Display({ on, state }: DeviceDisplayProps) {
  const unit = state as Gtx327State;
  const lit = on && unit.mode !== 'off';
  return (
    <DeviceDisplayFrame on={on} size={RADIO_MIRROR} label="XPDR">
      <div style={screenStyle}>
        <span data-field="mode">{lit ? unit.mode.toUpperCase() : ''}</span>
        <span data-field="code" style={codeStyle}>
          {lit ? codeText(unit) : ''}
        </span>
        <span data-field="reading" style={readingStyle}>
          {lit ? readingText(unit) : ''}
        </span>
        {lit && unit.ident && (
          <span data-field="ident" style={identStyle}>
            IDENT
          </span>
        )}
      </div>
    </DeviceDisplayFrame>
  );
}

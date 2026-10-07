import type { DeviceScreenProps } from '@cpt/panel-kit';
import type { CSSProperties } from 'react';
import { MODES } from '../logic';
import type { TransponderState } from '../logic';
import './TransponderScreen.css';

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

const displayStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 'var(--space-3)',
  minHeight: 'var(--leading-3xl)',
};

const codeStyle: CSSProperties = {
  fontSize: 'var(--text-3xl)',
  lineHeight: 'var(--leading-3xl)',
};

const legendStyle: CSSProperties = { color: 'var(--panel-legend-muted)' };

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

const selectedStyle: CSSProperties = {
  ...buttonStyle,
  background: 'var(--panel-cap-light)',
  color: 'var(--panel-surface)',
};

const DIGIT_COUNT = 8;
const CODE_CONTROLS = ['code1', 'code2', 'code3', 'code4'] as const;

export function TransponderScreen({ on, state, send }: DeviceScreenProps) {
  const { mode, squawk, altitude, ident } = state as TransponderState;

  const stepDigit = (index: number, by: number) => () => {
    const current = Number(squawk[index] ?? '0');
    const control = CODE_CONTROLS[index];
    if (control) send(control, 'set', String((current + by + DIGIT_COUNT) % DIGIT_COUNT));
  };

  return (
    <div className="cpt-device-transponder" style={screenStyle}>
      <div data-display style={displayStyle}>
        {on && (
          <>
            <span>{mode.toUpperCase()}</span>
            {mode !== 'off' && <span style={codeStyle}>{squawk}</span>}
            {altitude !== null && <span>{`${Math.round(altitude)} FT`}</span>}
            {ident && <span style={legendStyle}>IDENT</span>}
          </>
        )}
      </div>
      <div style={rowStyle}>
        {MODES.map((candidate) => (
          <button
            key={candidate}
            type="button"
            aria-pressed={candidate === mode}
            data-control="mode"
            data-position={candidate}
            style={candidate === mode ? selectedStyle : buttonStyle}
            onClick={() => send('mode', 'set', candidate)}
          >
            {candidate.toUpperCase()}
          </button>
        ))}
        <button
          type="button"
          style={buttonStyle}
          data-control="ident"
          onClick={() => {
            send('ident', 'press');
            send('ident', 'release');
          }}
        >
          IDENT
        </button>
      </div>
      <div style={rowStyle}>
        {CODE_CONTROLS.map((control, index) => (
          <span key={control} style={rowStyle}>
            <button
              type="button"
              style={buttonStyle}
              data-control={control}
              onClick={stepDigit(index, 1)}
            >
              {`SQ${index + 1} +`}
            </button>
            <button
              type="button"
              style={buttonStyle}
              data-control={control}
              onClick={stepDigit(index, -1)}
            >
              {`SQ${index + 1} −`}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

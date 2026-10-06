import { useHold } from '@cpt/panel-kit';
import type { DeviceScreenProps } from '@cpt/panel-kit';
import type { CSSProperties } from 'react';
import { DIGIT_KEYS, MODES } from '../logic';
import type { Gtx327State } from '../logic';

const focusRule =
  '.cpt-device-gtx327 button:focus-visible { outline: var(--space-1) solid var(--panel-focus); }';

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const CODE_LENGTH = 4;
const TEST_PATTERN = '8888';

const screenStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--space-1)',
  padding: 'var(--space-2)',
  background: 'var(--panel-screen)',
  color: 'var(--panel-legend)',
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-md)',
  lineHeight: 'var(--leading-md)',
};

const displayStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  alignItems: 'baseline',
  columnGap: 'var(--space-3)',
  minHeight: 'var(--leading-3xl)',
};

const codeStyle: CSSProperties = {
  fontSize: 'var(--text-3xl)',
  lineHeight: 'var(--leading-3xl)',
};

const readingStyle: CSSProperties = { textAlign: 'right' };

const legendStyle: CSSProperties = { color: 'var(--panel-legend-muted)' };

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(10, minmax(var(--size-target), max-content))',
  gap: 'var(--space-1)',
};

const buttonStyle: CSSProperties = {
  minWidth: 'var(--size-target)',
  minHeight: 'var(--size-target)',
  padding: '0 var(--space-1)',
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

type Send = DeviceScreenProps['send'];

function Key({ name, control, send }: { name: string; control: string; send: Send }) {
  const hold = useHold(() => send(control, 'release'));
  return (
    <button type="button" style={buttonStyle} {...hold.handlers(() => send(control, 'press'))}>
      {name}
    </button>
  );
}

const pad = (value: number): string => String(value).padStart(2, '0');

function formatTimer(ms: number): string {
  const total = Math.floor(ms / MS_PER_SECOND);
  const seconds = total % SECONDS_PER_MINUTE;
  const minutes = Math.floor(total / SECONDS_PER_MINUTE) % MINUTES_PER_HOUR;
  const hours = Math.floor(total / (SECONDS_PER_MINUTE * MINUTES_PER_HOUR));
  return `${hours}:${pad(minutes)}:${pad(seconds)}`;
}

function codeText({ mode, entry, squawk }: Gtx327State): string {
  if (mode === 'tst') return TEST_PATTERN;
  return entry === '' ? squawk : entry.padEnd(CODE_LENGTH, '_');
}

function readingText(state: Gtx327State): string {
  if (state.page === 'countUp') return formatTimer(state.timerMs);
  return state.altitude === null ? '' : `${Math.round(state.altitude)} FT`;
}

export function Gtx327Screen({ on, state, send }: DeviceScreenProps) {
  const unit = state as Gtx327State;
  const lit = on && unit.mode !== 'off';

  return (
    <div className="cpt-device-gtx327" style={screenStyle}>
      <style>{focusRule}</style>
      <div data-display style={displayStyle}>
        {lit && (
          <>
            <span>{unit.mode.toUpperCase()}</span>
            <span style={codeStyle}>{codeText(unit)}</span>
            <span style={readingStyle}>
              {readingText(unit)}
              {unit.ident && <span style={legendStyle}>{' IDENT'}</span>}
            </span>
          </>
        )}
      </div>
      <div style={gridStyle}>
        {MODES.map((candidate) => (
          <button
            key={candidate}
            type="button"
            aria-pressed={candidate === unit.mode}
            style={candidate === unit.mode ? selectedStyle : buttonStyle}
            onClick={() => send('mode', 'set', candidate)}
          >
            {candidate.toUpperCase()}
          </button>
        ))}
        <Key name="VFR" control="vfr" send={send} />
        <Key name="IDENT" control="ident" send={send} />
        <Key name="FUNC" control="func" send={send} />
        <Key name="START/STOP" control="startStop" send={send} />
        {DIGIT_KEYS.map((control) => (
          <Key key={control} name={control.slice(-1)} control={control} send={send} />
        ))}
        <Key name="CLR" control="clr" send={send} />
        <Key name="CRSR" control="crsr" send={send} />
      </div>
    </div>
  );
}

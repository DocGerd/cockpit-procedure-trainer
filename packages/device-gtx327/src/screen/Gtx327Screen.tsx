import { useHold } from '@cpt/panel-kit';
import type { DeviceScreenProps } from '@cpt/panel-kit';
import type { CSSProperties } from 'react';
import { DIGIT_KEYS, MODES, codeText, readingText } from '../logic';
import type { Gtx327State } from '../logic';
import './Gtx327Screen.css';

const COLUMNS = 7;
const DISPLAY_WIDTH = 'calc(var(--space-12) + var(--space-10))';

const screenStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `${DISPLAY_WIDTH} max-content`,
  columnGap: 'var(--space-1)',
  background: 'var(--panel-screen)',
  color: 'var(--panel-legend)',
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-md)',
  lineHeight: 'var(--leading-md)',
};

const displayStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: 'var(--space-1)',
  minWidth: 0,
};

const codeStyle: CSSProperties = {
  fontSize: 'var(--text-2xl)',
  lineHeight: 'var(--leading-2xl)',
};

const readingStyle: CSSProperties = { textAlign: 'right' };

const legendStyle: CSSProperties = { display: 'block', color: 'var(--panel-legend-muted)' };

// Keys touch: the visible space between them is drawn inside each target, so a key's whole
// cell stays operable and the grid needs no more room than the targets themselves.
const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(${COLUMNS}, var(--size-target))`,
  gridAutoRows: 'var(--size-target)',
  gap: 0,
};

const buttonStyle: CSSProperties = {
  minWidth: 'var(--size-target)',
  minHeight: 'var(--size-target)',
  padding: 0,
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  boxShadow: 'inset 0 0 0 calc(var(--space-1) / 2) var(--panel-screen)',
  background: 'var(--panel-bezel-dark)',
  color: 'var(--panel-legend)',
  fontFamily: 'inherit',
  fontSize: 'var(--text-xs)',
  cursor: 'pointer',
};

const selectedStyle: CSSProperties = {
  ...buttonStyle,
  background: 'var(--panel-cap-light)',
  color: 'var(--panel-surface)',
};

type Send = DeviceScreenProps['send'];

type KeyProps = { name: string; control: string; send: Send; span?: number };

function Key({ name, control, send, span = 1 }: KeyProps) {
  const hold = useHold(() => send(control, 'release'));
  const style = span > 1 ? { ...buttonStyle, gridColumn: `span ${span}` } : buttonStyle;
  return (
    <button
      type="button"
      style={style}
      data-control={control}
      {...hold.handlers(() => send(control, 'press'))}
    >
      {name}
    </button>
  );
}

export function Gtx327Screen({ on, state, send }: DeviceScreenProps) {
  const unit = state as Gtx327State;
  const lit = on && unit.mode !== 'off';

  return (
    <div className="cpt-device-gtx327" style={screenStyle}>
      <div data-display style={displayStyle}>
        {lit && (
          <>
            <span>{unit.mode.toUpperCase()}</span>
            <span style={codeStyle}>{codeText(unit)}</span>
            <span style={readingStyle}>
              {readingText(unit)}
              {unit.ident && <span style={legendStyle}>IDENT</span>}
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
            data-control="mode"
            data-position={candidate}
            style={candidate === unit.mode ? selectedStyle : buttonStyle}
            onClick={() => send('mode', 'set', candidate)}
          >
            {candidate.toUpperCase()}
          </button>
        ))}
        <Key name="VFR" control="vfr" send={send} />
        <Key name="IDENT" control="ident" send={send} />
        <Key name="FUNC" control="func" send={send} />
        <Key name="START/STOP" control="startStop" send={send} span={2} />
        {DIGIT_KEYS.map((control) => (
          <Key key={control} name={control.slice(-1)} control={control} send={send} />
        ))}
        <Key name="CLR" control="clr" send={send} />
        <Key name="CRSR" control="crsr" send={send} />
      </div>
    </div>
  );
}

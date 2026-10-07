import type { ControlPosition } from '@cpt/core';
import { useHold } from '@cpt/panel-kit';
import type { DeviceScreenProps } from '@cpt/panel-kit';
import type { CSSProperties } from 'react';
import { formatFrequency } from '../logic';
import type { Sl40State } from '../logic';
import './Sl40Screen.css';

const screenStyle: CSSProperties = {
  display: 'grid',
  background: 'var(--panel-screen)',
  color: 'var(--panel-legend)',
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-md)',
  lineHeight: 'var(--leading-md)',
};

const readoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  columnGap: 'var(--space-3)',
  alignItems: 'baseline',
  padding: '0 var(--space-1)',
};

const legendStyle: CSSProperties = {
  color: 'var(--panel-legend-muted)',
  fontSize: 'var(--text-2xs)',
  lineHeight: 'var(--leading-2xs)',
};

const valueStyle: CSSProperties = {
  fontSize: 'var(--text-2xl)',
  lineHeight: 'var(--leading-2xl)',
  textAlign: 'right',
};

const standbyLegendStyle: CSSProperties = {
  ...legendStyle,
  display: 'flex',
  justifyContent: 'space-between',
  minHeight: 'var(--leading-2xs)',
};

// Buttons touch: the visible space between them is drawn inside each target, so the rows need
// no more room than the targets themselves.
const rowStyle: CSSProperties = { display: 'flex', gap: 0 };

const buttonStyle: CSSProperties = {
  minWidth: 'var(--size-target)',
  minHeight: 'var(--size-target)',
  padding: '0 var(--space-1)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  boxShadow: 'inset 0 0 0 var(--space-1) var(--panel-screen)',
  background: 'var(--panel-bezel-dark)',
  color: 'var(--panel-legend)',
  fontFamily: 'inherit',
  fontSize: 'var(--text-sm)',
  cursor: 'pointer',
};

const volumeStyle: CSSProperties = { flex: 1, minHeight: 'var(--size-target)' };

const volumeLabelStyle: CSSProperties = {
  ...legendStyle,
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  paddingLeft: 'var(--space-2)',
};

type HoldButtonProps = { name: string; control: string; send: DeviceScreenProps['send'] };

function HoldButton({ name, control, send }: HoldButtonProps) {
  const hold = useHold(() => send(control, 'release'));
  return (
    <button
      type="button"
      style={buttonStyle}
      data-control={control}
      {...hold.handlers(() => send(control, 'press'))}
    >
      {name}
    </button>
  );
}

export function Sl40Screen({ on, state, send }: DeviceScreenProps) {
  const { active, standby, volume, monitoring } = state as Sl40State;

  const click = (control: string, position?: ControlPosition) => () => {
    if (position === undefined) send(control, 'press');
    else send(control, 'press', position);
    send(control, 'release');
  };

  const button = (name: string, control: string, position?: ControlPosition) => (
    <button
      type="button"
      style={buttonStyle}
      data-control={control}
      data-position={position === undefined ? undefined : String(position)}
      onClick={click(control, position)}
    >
      {name}
    </button>
  );

  return (
    <div className="cpt-device-sl40" style={screenStyle}>
      <div style={readoutStyle}>
        <span style={legendStyle}>ACT</span>
        <span style={standbyLegendStyle}>
          <span>STBY</span>
          <span>{on && monitoring ? 'MONITOR' : ''}</span>
        </span>
        <span style={valueStyle}>{on ? formatFrequency(active) : ''}</span>
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
        <HoldButton name="MON" control="monitor" send={send} />
        <label style={volumeLabelStyle}>
          <span>VOL</span>
          <input
            type="range"
            data-control="volume"
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

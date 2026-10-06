import type { ControlPosition } from '@cpt/core';
import type { DeviceScreenProps } from '@cpt/panel-kit';
import type { CSSProperties } from 'react';
import { formatFrequency } from '../logic';
import type { Sl40State } from '../logic';

const track =
  'height: var(--space-2); border-radius: var(--radius-pill); background: var(--panel-bezel); border: 0;';
const thumb =
  'width: var(--space-4); height: var(--space-4); border-radius: var(--radius-pill); background: var(--panel-cap-light); border: 0;';

const comScreenCss = [
  '.cpt-device-sl40 button:focus-visible, .cpt-device-sl40 input:focus-visible { outline: var(--space-1) solid var(--panel-focus); }',
  '.cpt-device-sl40 input[type="range"] { accent-color: var(--panel-cap-light); appearance: none; background: transparent; }',
  `.cpt-device-sl40 input[type="range"]::-webkit-slider-runnable-track { ${track} }`,
  `.cpt-device-sl40 input[type="range"]::-moz-range-track { ${track} }`,
  `.cpt-device-sl40 input[type="range"]::-webkit-slider-thumb { appearance: none; margin-top: calc((var(--space-2) - var(--space-4)) / 2); ${thumb} }`,
  `.cpt-device-sl40 input[type="range"]::-moz-range-thumb { ${thumb} }`,
].join('\n');

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

const flagStyle: CSSProperties = { textAlign: 'right', minHeight: 'var(--leading-md)' };

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

export function Sl40Screen({ on, state, send }: DeviceScreenProps) {
  const { active, standby, volume, monitoring } = state as Sl40State;

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
    <div className="cpt-device-sl40" style={screenStyle}>
      <style>{comScreenCss}</style>
      <div style={readoutStyle}>
        <span style={legendStyle}>ACT</span>
        <span style={valueStyle}>{on ? formatFrequency(active) : ''}</span>
        <span style={legendStyle}>STBY</span>
        <span style={valueStyle}>{on ? formatFrequency(standby) : ''}</span>
        <span style={legendStyle} />
        <span style={flagStyle}>{on && monitoring ? 'MONITOR' : ''}</span>
      </div>
      <div style={rowStyle}>
        {button('STBY MHz −', 'coarse', 'down')}
        {button('STBY MHz +', 'coarse', 'up')}
        {button('STBY kHz −', 'fine', 'down')}
        {button('STBY kHz +', 'fine', 'up')}
      </div>
      <div style={rowStyle}>
        {button('SWAP', 'swap')}
        {button('MON', 'monitor')}
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
      </div>
    </div>
  );
}

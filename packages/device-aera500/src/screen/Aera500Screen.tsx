import { useHold } from '@cpt/panel-kit';
import type { DeviceScreenProps } from '@cpt/panel-kit';
import type { CSSProperties } from 'react';
import { ICON_NAMES, shownIcons } from '../logic';
import type { Aera500State, TouchIcon } from '../logic';
import { AeraFace } from './AeraFace';
import './Aera500Screen.css';

const screenStyle: CSSProperties = {
  boxSizing: 'border-box',
  display: 'grid',
  gap: 'var(--space-2)',
  width: 'calc(var(--space-12) * 9 + var(--space-6))',
  padding: 'var(--space-2)',
  background: 'var(--panel-screen)',
  color: 'var(--panel-legend)',
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-md)',
  lineHeight: 'var(--leading-md)',
};

const windowStyle: CSSProperties = {
  height: 'calc(var(--space-12) * 3 + var(--space-3) * 3)',
  overflow: 'hidden',
};

// Room for the six icons of Home beside POWER, so every page has the same natural size.
const keysStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gridTemplateRows: 'repeat(2, var(--size-target))',
  gap: 'var(--space-2)',
};

const keyStyle: CSSProperties = {
  minWidth: 'var(--size-target)',
  minHeight: 'var(--size-target)',
  padding: '0 var(--space-1)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--panel-bezel-dark)',
  color: 'var(--panel-legend)',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  lineHeight: 'inherit',
  cursor: 'pointer',
};

const powerStyle: CSSProperties = { ...keyStyle, gridColumn: 4, gridRow: '1 / span 2' };

type Send = DeviceScreenProps['send'];

function PowerKey({ send }: { send: Send }) {
  const hold = useHold(() => send('power', 'release'));
  return (
    <button
      type="button"
      style={powerStyle}
      data-control="power"
      {...hold.handlers(() => send('power', 'press'))}
    >
      POWER
    </button>
  );
}

function IconKey({ icon, send }: { icon: TouchIcon; send: Send }) {
  const click = () => {
    send('touch', 'press', icon);
    send('touch', 'release');
  };
  return (
    <button
      type="button"
      style={icon === 'accept' ? { ...keyStyle, gridColumn: 'span 3' } : keyStyle}
      data-control="touch"
      data-position={icon}
      onClick={click}
    >
      {ICON_NAMES[icon]}
    </button>
  );
}

export function Aera500Screen({ on, state, send }: DeviceScreenProps) {
  const unit = state as Aera500State;
  return (
    <div className="cpt-device-aera500" style={screenStyle}>
      <div data-display style={windowStyle}>
        <AeraFace state={unit} lit={on && unit.on} compact={false} />
      </div>
      <div style={keysStyle}>
        <PowerKey send={send} />
        {shownIcons(unit).map((icon) => (
          <IconKey key={icon} icon={icon} send={send} />
        ))}
      </div>
    </div>
  );
}

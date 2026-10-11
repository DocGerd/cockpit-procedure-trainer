import { useHold } from '@cpt/panel-kit';
import type { DeviceScreenProps } from '@cpt/panel-kit';
import type { CSSProperties } from 'react';
import type { Trt800hState } from '../logic';
import { AtcFace } from './AtcFace';
import './Trt800hScreen.css';

const KEY_WIDTH = 'calc(var(--size-target) * 2)';

// Keys touch: the visible space between them is drawn inside each target, so a key's whole
// cell stays operable and the grid needs no more room than the targets themselves.
const screenStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(3, ${KEY_WIDTH})`,
  gridTemplateRows: 'var(--size-target) auto var(--size-target) var(--size-target)',
  gap: 0,
  background: 'var(--panel-screen)',
  color: 'var(--panel-legend)',
  fontFamily: 'var(--font-mono)',
};

const faceStyle: CSSProperties = { gridColumn: '1 / 4', gridRow: 2 };

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
  fontSize: 'var(--text-sm)',
  cursor: 'pointer',
};

type Send = DeviceScreenProps['send'];

type KeyProps = {
  name: string;
  control: string;
  send: Send;
  label?: string;
  position?: string;
  column: number;
  row: number;
};

function Key({ name, control, send, label, position, column, row }: KeyProps) {
  const hold = useHold(() => send(control, 'release'));
  const press = () =>
    position === undefined ? send(control, 'press') : send(control, 'press', position);
  return (
    <button
      type="button"
      aria-label={label}
      style={{ ...buttonStyle, gridColumn: column, gridRow: row }}
      data-control={control}
      data-position={position}
      {...hold.handlers(press)}
    >
      {name}
    </button>
  );
}

export function Trt800hScreen({ on, state, send }: DeviceScreenProps) {
  return (
    <div className="cpt-device-trt800h" style={screenStyle}>
      <AtcFace state={state as Trt800hState} on={on} size="screen" style={faceStyle} />
      <Key name="I/O" control="power" column={1} row={1} send={send} />
      <Key name="VFR" control="vfr" column={2} row={1} send={send} />
      <Key name="ID" control="ident" column={3} row={1} send={send} />
      <Key name="MODE" control="mode" column={1} row={3} send={send} />
      <Key name="▲▼" control="swap" column={2} row={3} send={send} label="CHANGE" />
      <Key name="►" control="cursor" column={3} row={3} send={send} label="CURSOR" />
      <Key name="CODE −" control="knob" position="down" column={2} row={4} send={send} />
      <Key name="CODE +" control="knob" position="up" column={3} row={4} send={send} />
    </div>
  );
}

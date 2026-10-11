import { useHold } from '@cpt/panel-kit';
import type { DeviceScreenProps } from '@cpt/panel-kit';
import type { CSSProperties } from 'react';
import { FaceLines } from '../face/FaceLines';
import type { Atr833State } from '../logic';
import './Atr833Screen.css';

const COLUMNS = 5;
const KEY_WIDTH = 'calc(var(--space-12) + var(--space-4))';

const screenStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(${COLUMNS}, ${KEY_WIDTH})`,
  gridTemplateRows: 'var(--size-target) auto var(--size-target)',
  background: 'var(--panel-screen)',
  color: 'var(--panel-legend)',
  fontFamily: 'var(--font-mono)',
};

// The display window: glass lies over this first block, never over the keys.
const displayStyle: CSSProperties = {
  gridColumn: '1 / 4',
  gridRow: 2,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  padding: 'var(--space-2)',
  minWidth: 0,
};

// Keys touch: the visible space between them is drawn inside each target, so a key's whole
// cell stays operable and the grid needs no more room than the targets themselves.
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
  label: string;
  name?: string;
  control: string;
  position?: string;
  column: number;
  row: number;
  send: Send;
};

function Key({ label, name, control, position, column, row, send }: KeyProps) {
  const hold = useHold(() => send(control, 'release'));
  const press = () =>
    position === undefined ? send(control, 'press') : send(control, 'press', position);
  return (
    <button
      type="button"
      aria-label={name}
      style={{ ...buttonStyle, gridColumn: column, gridRow: row }}
      data-control={control}
      data-position={position}
      {...hold.handlers(press)}
    >
      {label}
    </button>
  );
}

export function Atr833Screen({ on, state, send }: DeviceScreenProps) {
  const unit = state as Atr833State;

  return (
    <div className="cpt-device-atr833" style={screenStyle}>
      <div data-display style={displayStyle}>
        <FaceLines on={on} state={unit} />
      </div>
      <Key label="I/O" control="power" column={1} row={1} send={send} />
      <Key label="SET" control="set" column={2} row={1} send={send} />
      <Key label="MEM" control="mem" column={3} row={1} send={send} />
      <Key label="VOL/SEL −" control="volSel" position="down" column={4} row={1} send={send} />
      <Key label="VOL/SEL +" control="volSel" position="up" column={5} row={1} send={send} />
      <Key label="DW" control="dw" column={1} row={3} send={send} />
      <Key label="▼▲" name="SWAP" control="swap" column={2} row={3} send={send} />
      <Key label="►" name="CURSOR" control="cursor" column={3} row={3} send={send} />
      <Key label="FREQ −" control="freq" position="down" column={4} row={3} send={send} />
      <Key label="FREQ +" control="freq" position="up" column={5} row={3} send={send} />
    </div>
  );
}

import { useHold } from '@cpt/panel-kit';
import type { DeviceScreenProps } from '@cpt/panel-kit';
import type { CSSProperties } from 'react';
import { BACKLIGHT_LEVELS } from '../logic';
import type { Gpsmap496Page, Gpsmap496State } from '../logic';

const focusRule =
  '.cpt-device-gpsmap496 button:focus-visible { outline: var(--space-1) solid var(--panel-focus); }';

const PAGE_NAMES: Readonly<Record<Gpsmap496Page, string>> = {
  map: 'MAP',
  terrain: 'TERRAIN',
  route: 'ACTIVE ROUTE',
  info: 'INFORMATION',
};

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
  display: 'grid',
  placeContent: 'center',
  justifyItems: 'center',
  minHeight: 'calc(var(--size-target) * 2)',
};

const pageStyle: CSSProperties = {
  fontSize: 'var(--text-xl)',
  lineHeight: 'var(--leading-xl)',
};

const legendStyle: CSSProperties = { color: 'var(--panel-legend-muted)' };

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(var(--size-target), 1fr))',
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

type Send = DeviceScreenProps['send'];

function Key({ name, control, send }: { name: string; control: string; send: Send }) {
  const hold = useHold(() => send(control, 'release'));
  return (
    <button type="button" style={buttonStyle} {...hold.handlers(() => send(control, 'press'))}>
      {name}
    </button>
  );
}

export function Gpsmap496Screen({ on, state, send }: DeviceScreenProps) {
  const unit = state as Gpsmap496State;
  const lit = on && unit.on;

  return (
    <div className="cpt-device-gpsmap496" style={screenStyle}>
      <style>{focusRule}</style>
      <div data-display style={displayStyle}>
        {lit && (
          <>
            <span style={pageStyle}>{PAGE_NAMES[unit.page]}</span>
            <span>NO POSITION</span>
            <span style={legendStyle}>{`LIGHT ${unit.backlight + 1}/${BACKLIGHT_LEVELS}`}</span>
          </>
        )}
      </div>
      <div style={rowStyle}>
        <Key name="POWER" control="power" send={send} />
        <Key name="LIGHT" control="backlight" send={send} />
        <Key name="PAGE" control="page" send={send} />
        <Key name="QUIT" control="quit" send={send} />
      </div>
    </div>
  );
}

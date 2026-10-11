import type { CSSProperties } from 'react';
import { BACKLIGHT_MAX, RANGES_NM, receiverStatus } from '../logic';
import type { Aera500State, ReceiverStatus } from '../logic';
import { STATUS_NAMES } from '../logic';
import { MapSchematic } from './MapSchematic';

const DASHES = '---';

const bodyStyle = (compact: boolean): CSSProperties => ({
  boxSizing: 'border-box',
  display: 'grid',
  alignContent: 'center',
  justifyItems: 'center',
  gap: 'var(--space-1)',
  width: '100%',
  height: '100%',
  padding: 'var(--space-2)',
  overflow: 'hidden',
  background: 'var(--panel-screen)',
  color: 'var(--panel-legend)',
  fontFamily: 'var(--font-mono)',
  fontSize: compact ? 'var(--text-2xl)' : 'var(--text-md)',
  lineHeight: compact ? 'var(--leading-2xl)' : 'var(--leading-md)',
  textAlign: 'center',
});

const titleStyle = (compact: boolean): CSSProperties => ({
  fontSize: compact ? 'var(--text-3xl)' : 'var(--text-xl)',
  lineHeight: compact ? 'var(--leading-3xl)' : 'var(--leading-xl)',
});

const mutedStyle: CSSProperties = { color: 'var(--panel-legend-muted)' };

const mapBodyStyle: CSSProperties = {
  gridTemplateRows: 'auto minmax(0, 1fr)',
  alignContent: 'stretch',
  justifyItems: 'stretch',
  gap: 'var(--space-1)',
  padding: 'var(--space-1) var(--space-2)',
};

const fieldsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 'var(--space-2)',
};

// The Screen's four fields take two rows, so the dock's narrowest width still holds them.
const fieldRowsStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, auto)',
  justifyContent: 'space-between',
  columnGap: 'var(--space-2)',
};

const mapStyle: CSSProperties = { position: 'relative', minHeight: 0 };

const rangeStyle: CSSProperties = { position: 'absolute', right: 0, bottom: 0 };

const unknownStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
};

const barsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 'var(--space-1)',
  height: 'var(--space-8)',
};

const BARS = 4;
const BAR_HEIGHT = ['25%', '50%', '75%', '100%'] as const;
const BARS_LIT: Readonly<Record<ReceiverStatus, number>> = { searching: 0, acquiring: 2, fix: 4 };

function SignalBars({ status }: { status: ReceiverStatus }) {
  return (
    <div data-field="bars" data-lit={BARS_LIT[status]} style={barsStyle} aria-hidden="true">
      {Array.from({ length: BARS }, (_, index) => (
        <span
          key={index}
          data-lit={index < BARS_LIT[status] ? 'true' : 'false'}
          style={{
            width: 'var(--space-3)',
            height: BAR_HEIGHT[index],
            background:
              index < BARS_LIT[status] ? 'var(--panel-legend)' : 'var(--panel-legend-muted)',
            opacity: index < BARS_LIT[status] ? 1 : 0.4,
          }}
        />
      ))}
    </div>
  );
}

const dashed = (value: number | null, format: (rounded: number) => string): string =>
  value === null ? DASHES : format(Math.round(value));

export const formatSpeed = (knots: number | null): string => `GS ${dashed(knots, String)}KT`;

export const formatAltitude = (feet: number | null): string => `ALT ${dashed(feet, String)}FT`;

export const formatRange = (rangeIndex: number): string => `${RANGES_NM[rangeIndex]}NM`;

type Props = { state: Aera500State; lit: boolean; compact: boolean };

/** What the glass shows: the page, or the backlight overlay over it. Shared by the Screen and the Display. */
export function AeraFace({ state, lit, compact }: Props) {
  const body = bodyStyle(compact);
  if (!lit) return <div data-face-dark style={body} />;

  const title = titleStyle(compact);
  const status = receiverStatus(state);

  if (state.overlay) {
    return (
      <div data-page="overlay" style={body}>
        <span data-field="title" style={title}>
          BACKLIGHT
        </span>
        <span data-field="backlight">{`${state.backlight}/${BACKLIGHT_MAX}`}</span>
      </div>
    );
  }

  switch (state.page) {
    case 'startup':
      return (
        <div data-page="startup" style={body}>
          <span data-field="title" style={title}>
            DATABASES
          </span>
          <span style={mutedStyle}>Check, then accept</span>
        </div>
      );
    case 'home':
      return (
        <div data-page="home" style={body}>
          <span data-field="title" style={title}>
            HOME
          </span>
          <SignalBars status={status} />
        </div>
      );
    case 'map':
      return (
        <div data-page="map" style={{ ...body, ...mapBodyStyle }}>
          <div style={compact ? fieldsStyle : fieldRowsStyle}>
            <span data-field="speed">{formatSpeed(state.groundSpeedKt)}</span>
            <span data-field="bearing" style={mutedStyle}>{`BRG ${DASHES}`}</span>
            {!compact && (
              <>
                <span data-field="ete" style={mutedStyle}>{`ETE NEXT ${DASHES}`}</span>
                <span data-field="dist" style={mutedStyle}>{`DIST NEXT ${DASHES}`}</span>
              </>
            )}
          </div>
          <div style={mapStyle}>
            <MapSchematic trackDeg={state.trackDeg} style={{ width: '100%', height: '100%' }} />
            {!state.fix && (
              <span data-field="unknown" style={unknownStyle}>
                ?
              </span>
            )}
            <span data-field="range" style={rangeStyle}>
              {formatRange(state.rangeIndex)}
            </span>
          </div>
        </div>
      );
    case 'nearest':
      return (
        <div data-page="nearest" style={body}>
          <span data-field="title" style={title}>
            NEAREST
          </span>
          <span style={mutedStyle}>Airport: no entries</span>
        </div>
      );
    case 'activeFpl':
      return (
        <div data-page="activeFpl" style={body}>
          <span data-field="title" style={title}>
            ACTIVE FPL
          </span>
          <span style={mutedStyle}>No flight plan</span>
        </div>
      );
    case 'directTo':
      return (
        <div data-page="directTo" style={body}>
          <span data-field="title" style={title}>
            DIRECT TO
          </span>
          <span style={mutedStyle}>ID · Name · City</span>
        </div>
      );
    case 'position':
      return (
        <div data-page="position" style={body}>
          <span data-field="title" style={title}>
            POSITION
          </span>
          <span data-field="altitude">{formatAltitude(state.altitudeFt)}</span>
        </div>
      );
    case 'tools':
      return (
        <div data-page="tools" style={body}>
          <span data-field="title" style={title}>
            TOOLS
          </span>
          <span style={mutedStyle}>GPS Status</span>
        </div>
      );
    case 'gpsStatus':
      return (
        <div data-page="gpsStatus" style={body}>
          <span data-field="title" style={title}>
            GPS STATUS
          </span>
          <span data-field="status">{STATUS_NAMES[status]}</span>
          <SignalBars status={status} />
        </div>
      );
  }
}

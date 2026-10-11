import { useHold } from '@cpt/panel-kit';
import type { DeviceScreenProps } from '@cpt/panel-kit';
import type { CSSProperties, ReactNode } from 'react';
import { BACKLIGHT_MAX, ICON_NAMES, RANGES_NM, receiverStatus, shownIcons } from '../logic';
import type { Aera500State, ReceiverStatus, TouchIcon } from '../logic';
import { STATUS_NAMES } from '../logic';
import { CradleArt, KeyArt } from './art';
import {
  CHART,
  CONTENT,
  FACE_SIZE_CSS,
  HOME_STRIP,
  KEYS,
  MAP_FIELDS,
  MENU_KEY,
  MIRROR_FACE_WIDTH,
  OWNSHIP,
  POWER_HIT,
  POWER_WORD,
  SCREEN,
  placeIn,
  pointIn,
  screenRect,
} from './geometry';
import type { KeySpec, MapField, Rect } from './geometry';
import { MapChart } from './MapChart';

/** `dock`: the operable face. `mirror`: the same face, read only, for a panel slot. */
export type FaceMode = 'dock' | 'mirror';
type Send = DeviceScreenProps['send'];
type Tier = 'body' | 'title' | 'key' | 'glyph';

// The mirror prints at the slot's secondary tier, which needs one step more than the dock.
const SIZES: Readonly<Record<FaceMode, Readonly<Record<Tier, string>>>> = {
  dock: { body: '2xs', title: 'xs', key: '2xs', glyph: 'lg' },
  mirror: { body: 'xs', title: 'sm', key: 'xs', glyph: 'lg' },
};

const DASHES = '---';

// A one-character name (the backlight's − and +) is a glyph, printed large.
const keyTier = (name: string): Tier => (name.length === 1 ? 'glyph' : 'key');

type TextProps = {
  mode: FaceMode;
  tier: Tier;
  style?: CSSProperties | undefined;
  children: ReactNode;
  field?: string | undefined;
};

function Text({ mode, tier, style, children, field }: TextProps) {
  const size = SIZES[mode][tier];
  return (
    <span
      data-field={field}
      data-lettering={mode === 'mirror' ? 'secondary' : undefined}
      style={{
        fontSize: `var(--text-${size})`,
        lineHeight: tier === 'key' || tier === 'glyph' ? 1 : `var(--leading-${size})`,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

const fillStyle: CSSProperties = { position: 'absolute', inset: 0 };
// The map's printed labels stack over the glass, whose edge shade would wash out their cores.
const outlined: CSSProperties = {
  zIndex: 1,
  textShadow:
    '0 0 calc(var(--space-1) / 2) var(--panel-shadow), 0 0 calc(var(--space-1) / 2) var(--panel-shadow)',
};
// One line per em, so a field's label row is its font size tall.
const tight: CSSProperties = { lineHeight: 1 };
const muted: CSSProperties = { color: 'var(--panel-legend-muted)' };
const centred: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
};

const inScreen = (rect: Rect) => ({ position: 'absolute' as const, ...placeIn(rect, SCREEN) });

const BARS = 4;
const BAR_HEIGHT = ['25%', '50%', '75%', '100%'] as const;
const BARS_LIT: Readonly<Record<ReceiverStatus, number>> = { searching: 0, acquiring: 2, fix: 4 };

function SignalBars({ status, height }: { status: ReceiverStatus; height: string }) {
  return (
    <div
      data-field="bars"
      data-lit={BARS_LIT[status]}
      aria-hidden="true"
      style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-1)', height }}
    >
      {Array.from({ length: BARS }, (_, index) => (
        <span
          key={index}
          data-lit={index < BARS_LIT[status] ? 'true' : 'false'}
          style={{
            width: 'var(--space-1)',
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

/** A text page: its title and lines, stacked in an area of the screen. */
function TextBlock({ area, children }: { area: Rect; children: ReactNode }) {
  return (
    <div
      style={{
        ...inScreen(area),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-1)',
      }}
    >
      {children}
    </div>
  );
}

/** A map field: its label centred on the photographed row, its value under it, outlined. */
function Field(props: { mode: FaceMode; field: MapField; label: string; value: string }) {
  const { mode, field, label, value } = props;
  const { edge, row, end } = MAP_FIELDS[field];
  const size = SIZES[mode].body;
  return (
    <span
      data-field={field}
      style={{
        position: 'absolute',
        ...(end ? { right: fraction(1 - edge) } : { left: fraction(edge) }),
        top: fraction((row[0] + row[1]) / 2),
        transform: `translateY(calc(var(--text-${size}) / -2))`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: end ? 'flex-end' : 'flex-start',
        ...outlined,
      }}
    >
      <Text mode={mode} tier="body" style={tight}>
        {label}
      </Text>{' '}
      <Text mode={mode} tier="body" style={tight}>
        {value}
      </Text>
    </span>
  );
}

const dashed = (value: number | null): string =>
  value === null ? DASHES : String(Math.round(value));

const fraction = (value: number) => `${Number((value * 100).toFixed(4))}%`;

// The range prints at the map's lower right, right-aligned over DIST NEXT and clear of its label.
const RANGE_GAP = 0.04;

function MapPage({ mode, state }: { mode: FaceMode; state: Aera500State }) {
  return (
    <div data-page="map" style={fillStyle}>
      <MapChart trackDeg={state.trackDeg} style={{ ...inScreen(CHART), display: 'block' }} />
      <Field mode={mode} field="speed" label="GS" value={`${dashed(state.groundSpeedKt)}KT`} />
      <Field mode={mode} field="ete" label="ETE NEXT" value={DASHES} />
      <Field mode={mode} field="bearing" label="BRG" value={DASHES} />
      <Field mode={mode} field="dist" label="DIST NEXT" value={DASHES} />
      <Text
        mode={mode}
        tier="body"
        field="range"
        style={{
          position: 'absolute',
          right: fraction(1 - MAP_FIELDS.dist.edge),
          bottom: fraction(1 - MAP_FIELDS.dist.row[0] + RANGE_GAP),
          ...outlined,
        }}
      >
        {`${RANGES_NM[state.rangeIndex]}NM`}
      </Text>
      {!state.fix && (
        <Text
          mode={mode}
          tier="title"
          field="unknown"
          style={{
            position: 'absolute',
            ...pointIn({ x: OWNSHIP.x, y: OWNSHIP.y - SCREEN.height * 0.16 }, SCREEN),
            transform: 'translate(-50%, -50%)',
            color: 'var(--panel-arc-red)',
            ...outlined,
          }}
        >
          ?
        </Text>
      )}
    </div>
  );
}

function PageText({ mode, state }: { mode: FaceMode; state: Aera500State }) {
  const status = receiverStatus(state);
  const title = (text: string) => (
    <Text mode={mode} tier="title" field="title">
      {text}
    </Text>
  );
  const line = (text: string, field?: string, style: CSSProperties = muted) => (
    <Text mode={mode} tier="body" field={field} style={style}>
      {text}
    </Text>
  );
  const page = (area: Rect, children: ReactNode) => (
    <div data-page={state.page} style={fillStyle}>
      <TextBlock area={area}>{children}</TextBlock>
    </div>
  );
  const besideColumn = { ...CONTENT, y: SCREEN.y + SCREEN.height * 0.08 };
  const above = (bottom: number) => screenRect(0, 1, 0.08, bottom);
  switch (state.page) {
    case 'startup':
      return page(
        above(0.56),
        <>
          {title('DATABASES')}
          {line('Check, then accept')}
        </>,
      );
    case 'home':
      return (
        <div data-page="home" style={fillStyle}>
          <div
            style={{
              ...inScreen(HOME_STRIP),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {title('HOME')}
            <SignalBars status={status} height="70%" />
          </div>
        </div>
      );
    case 'map':
      return <MapPage mode={mode} state={state} />;
    case 'nearest':
      return page(
        besideColumn,
        <>
          {title('NEAREST')}
          {line('Airport: no entries')}
        </>,
      );
    case 'activeFpl':
      return page(
        besideColumn,
        <>
          {title('ACTIVE FPL')}
          {line('No flight plan')}
        </>,
      );
    case 'directTo':
      return page(
        besideColumn,
        <>
          {title('DIRECT TO')}
          {line('ID · Name · City')}
        </>,
      );
    case 'position':
      return page(
        besideColumn,
        <>
          {title('POSITION')}
          {line(`ALT ${dashed(state.altitudeFt)}FT`, 'altitude', {})}
        </>,
      );
    case 'tools':
      return page({ ...besideColumn, height: SCREEN.height * 0.4 }, title('TOOLS'));
    case 'gpsStatus':
      return page(
        besideColumn,
        <>
          {title('GPS STATUS')}
          {line(STATUS_NAMES[status], 'status', {})}
          <SignalBars status={status} height="var(--space-6)" />
        </>,
      );
  }
}

function Overlay({ mode, state }: { mode: FaceMode; state: Aera500State }) {
  return (
    <div data-page="overlay" style={fillStyle}>
      <TextBlock area={screenRect(0, 1, 0.08, 0.36)}>
        <Text mode={mode} tier="title" field="title">
          BACKLIGHT
        </Text>
      </TextBlock>
      <div style={{ ...inScreen(screenRect(0.28, 0.72, 0.42, 0.86)), ...centred }}>
        <Text mode={mode} tier="title" field="backlight">
          {`${state.backlight}/${BACKLIGHT_MAX}`}
        </Text>
      </div>
    </div>
  );
}

const pageKeys = (state: Aera500State): readonly KeySpec[] => {
  const keys = shownIcons(state).map((icon) => KEYS[icon]);
  return !state.overlay && state.page === 'map' ? [...keys, MENU_KEY] : keys;
};

// The Map column top to bottom; other pages keep their logic order.
const labelOrder = (state: Aera500State): readonly (TouchIcon | 'menu')[] =>
  !state.overlay && state.page === 'map'
    ? ['zoomOut', 'zoomIn', 'menu', 'home']
    : shownIcons(state);

/** A key's printed name on the glass. The dock prints it in the key itself, except Menu. */
function KeyLabels({ mode, state }: { mode: FaceMode; state: Aera500State }) {
  const printed = labelOrder(state).filter((icon) => mode === 'mirror' || icon === 'menu');
  return printed.map((icon) => {
    const key = icon === 'menu' ? MENU_KEY : KEYS[icon];
    const name = icon === 'menu' ? 'Menu' : ICON_NAMES[icon];
    return (
      <span key={icon} data-key={icon} style={{ ...inScreen(key.label), ...centred }}>
        <Text mode={mode} tier={keyTier(name)}>
          {name}
        </Text>
      </span>
    );
  });
}

function Glass({ mode, state, lit }: { mode: FaceMode; state: Aera500State; lit: boolean }) {
  if (!lit) return <div data-face-dark style={fillStyle} />;
  return (
    <>
      {state.overlay ? (
        <Overlay mode={mode} state={state} />
      ) : (
        <PageText mode={mode} state={state} />
      )}
      <KeyArt keys={pageKeys(state)} />
      <KeyLabels mode={mode} state={state} />
    </>
  );
}

const keyStyle: CSSProperties = {
  position: 'absolute',
  boxSizing: 'border-box',
  minWidth: 'var(--size-target)',
  minHeight: 'var(--size-target)',
  padding: 0,
  margin: 0,
  border: 'none',
  color: 'var(--panel-legend)',
  fontFamily: 'inherit',
  fontWeight: 'inherit',
  cursor: 'pointer',
  touchAction: 'none',
};

function KeyName({ text, at, shown }: { text: string; at: CSSProperties; shown: boolean }) {
  return (
    <span
      data-key-label
      style={{ position: 'absolute', ...at, ...centred, opacity: shown ? undefined : 0 }}
    >
      <Text mode="dock" tier={keyTier(text)}>
        {text}
      </Text>
    </span>
  );
}

function PowerKey({ send }: { send: Send }) {
  const hold = useHold(() => send('power', 'release'));
  return (
    <button
      type="button"
      data-control="power"
      style={{ ...keyStyle, ...placeIn(POWER_HIT) }}
      {...hold.handlers(() => send('power', 'press'))}
    >
      <KeyName text="POWER" at={placeIn(POWER_WORD, POWER_HIT)} shown />
    </button>
  );
}

function TouchKey({ icon, lit, send }: { icon: TouchIcon; lit: boolean; send: Send }) {
  const key = KEYS[icon];
  const click = () => {
    send('touch', 'press', icon);
    send('touch', 'release');
  };
  return (
    <button
      type="button"
      data-control="touch"
      data-position={icon}
      style={{ ...keyStyle, ...placeIn(key.hit) }}
      onClick={click}
    >
      <KeyName text={ICON_NAMES[icon]} at={placeIn(key.label, key.hit)} shown={lit} />
    </button>
  );
}

const faceStyle: Readonly<Record<FaceMode, CSSProperties>> = {
  dock: { position: 'relative', ...FACE_SIZE_CSS },
  mirror: {
    position: 'absolute',
    top: 0,
    left: fraction((1 - MIRROR_FACE_WIDTH) / 2),
    width: fraction(MIRROR_FACE_WIDTH),
    height: '100%',
  },
};

const glassStyle: CSSProperties = {
  position: 'absolute',
  ...placeIn(SCREEN),
  overflow: 'hidden',
  background: 'var(--panel-screen)',
};

type FaceProps =
  | { mode: 'dock'; state: Aera500State; lit: boolean; send: Send }
  | { mode: 'mirror'; state: Aera500State; lit: boolean; send?: undefined };

/** The aera 500 in its cradle (intake 3.8.3): the dock's operable face and the slot's mirror. */
export function AeraFace({ mode, state, lit, send }: FaceProps) {
  return (
    <div
      className="cpt-device-aera500"
      style={{
        ...faceStyle[mode],
        fontFamily: 'var(--font-sans)',
        fontWeight: 'var(--weight-semibold)',
        color: 'var(--panel-legend)',
      }}
    >
      <CradleArt />
      <div data-display className="pk-glass" style={glassStyle}>
        <Glass mode={mode} state={state} lit={lit} />
      </div>
      {send ? (
        <>
          <PowerKey send={send} />
          {shownIcons(state).map((icon) => (
            <TouchKey key={icon} icon={icon} lit={lit} send={send} />
          ))}
        </>
      ) : (
        <span style={{ position: 'absolute', ...placeIn(POWER_WORD), ...centred }}>
          <Text mode={mode} tier="key">
            POWER
          </Text>
        </span>
      )}
    </div>
  );
}

import { useHold } from '@cpt/panel-kit';
import type { DeviceScreenProps } from '@cpt/panel-kit';
import { memo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ledsOf } from '../logic';
import type { FlarmState } from '../logic';
import './FlarmFace.css';
import {
  ABOVE,
  BAR,
  BELOW,
  CORNER_RADIUS,
  EDGE_WIDTH,
  FUSELAGE,
  GLOW_DIAMETER,
  LED_DIAMETER,
  LINE_WIDTH,
  MIRROR_FACE_WIDTH,
  MODE_CAP,
  MODE_CORNER,
  MODE_FRAME,
  MODE_LEGEND,
  RING,
  RING_BEARINGS,
  SIDE_LABEL_END,
  SIDE_LED_X,
  SPOKE_TAIL,
  STATUS_LABEL_X,
  STATUS_LEDS,
  STATUS_LED_X,
  TAILPLANE,
  VIEW_H,
  VIEW_W,
  WING,
  WORDMARK,
  mirrorX,
  ringLed,
  toViewX,
  toViewY,
} from './geometry';
import type { Box } from './geometry';

type Mode = 'dock' | 'mirror';

export type FlarmFaceProps =
  | { mode: 'dock'; on: boolean; state: FlarmState; send: DeviceScreenProps['send'] }
  | { mode: 'mirror'; on: boolean; state: FlarmState };

const percent = (fraction: number) => `${Number((fraction * 100).toFixed(4))}%`;
/** A length in fractions of the face height, in art units. */
const toViewH = toViewY;

const TYPE = {
  dock: { status: 'var(--text-xl)', side: 'var(--text-lg)', key: 'var(--text-lg)' },
  mirror: { status: 'var(--text-lg)', side: 'var(--text-sm)', key: 'var(--text-md)' },
} as const;

const boxStyle: Record<Mode, CSSProperties> = {
  dock: {
    position: 'relative',
    width: 'calc(var(--space-12) * 7 + var(--space-1))',
    aspectRatio: '9 / 5',
  },
  mirror: {
    position: 'absolute',
    top: 0,
    left: percent(mirrorX(0)),
    width: percent(MIRROR_FACE_WIDTH),
    height: '100%',
  },
};

const faceStyle: CSSProperties = {
  color: 'var(--panel-legend)',
  fontFamily: 'var(--font-sans)',
};

const artStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'block',
  width: '100%',
  height: '100%',
};

const line: CSSProperties = {
  fill: 'none',
  stroke: 'var(--panel-cap-light)',
  strokeWidth: toViewH(LINE_WIDTH),
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const rect = (box: Box, corner: number) => ({
  x: toViewX(box.left),
  y: toViewY(box.top),
  width: toViewX(box.right - box.left),
  height: toViewY(box.bottom - box.top),
  rx: toViewH(corner),
});

/** The fuselage, the pill wing and the tailplane as one outline, nose first, clockwise. */
function aircraftPath(): string {
  const x = toViewX(FUSELAGE.x);
  const half = toViewX(FUSELAGE.width) / 2;
  const tailHalf = toViewX(FUSELAGE.tailWidth) / 2;
  const nose = toViewY(FUSELAGE.nose);
  const shoulder = nose + half * 1.5;
  const [wingTop, wingBottom] = [toViewY(WING.top), toViewY(WING.bottom)];
  const wingEnd = (wingBottom - wingTop) / 2;
  const [tailTop, tailBottom] = [toViewY(TAILPLANE.top), toViewY(TAILPLANE.bottom)];
  const tailEnd = (tailBottom - tailTop) / 2;
  const wingRight = toViewX(WING.right) - wingEnd;
  const wingLeft = toViewX(WING.left) + wingEnd;
  const tailRight = toViewX(TAILPLANE.right) - tailEnd;
  const tailLeft = toViewX(TAILPLANE.left) + tailEnd;
  return [
    `M ${x - half} ${shoulder}`,
    `C ${x - half} ${nose + half * 0.4} ${x - half * 0.55} ${nose} ${x} ${nose}`,
    `C ${x + half * 0.55} ${nose} ${x + half} ${nose + half * 0.4} ${x + half} ${shoulder}`,
    `L ${x + half} ${wingTop} L ${wingRight} ${wingTop}`,
    `A ${wingEnd} ${wingEnd} 0 0 1 ${wingRight} ${wingBottom}`,
    `L ${x + half} ${wingBottom} L ${x + tailHalf} ${tailTop} L ${tailRight} ${tailTop}`,
    `A ${tailEnd} ${tailEnd} 0 0 1 ${tailRight} ${tailBottom}`,
    `L ${tailLeft} ${tailBottom}`,
    `A ${tailEnd} ${tailEnd} 0 0 1 ${tailLeft} ${tailTop}`,
    `L ${x - tailHalf} ${tailTop} L ${x - half} ${wingBottom} L ${wingLeft} ${wingBottom}`,
    `A ${wingEnd} ${wingEnd} 0 0 1 ${wingLeft} ${wingTop}`,
    `L ${x - half} ${wingTop} Z`,
  ].join(' ');
}

const AIRCRAFT = aircraftPath();

/** From the ring's centre, inside the wing, so the filled aircraft drawn over it hides the start. */
function spoke(bearing: number) {
  const radians = (bearing * Math.PI) / 180;
  const end = toViewH(RING.radius + LED_DIAMETER / 2 + SPOKE_TAIL);
  const [cx, cy] = [toViewX(RING.x), toViewY(RING.y)];
  return { x1: cx, y1: cy, x2: cx + end * Math.sin(radians), y2: cy - end * Math.cos(radians) };
}

/** Everything printed on the face that never changes: plate, spokes, aircraft, bar and key frame. */
const FaceArt = memo(function FaceArt() {
  const edge = toViewH(EDGE_WIDTH);
  return (
    <>
      <rect
        x={edge / 2}
        y={edge / 2}
        width={VIEW_W - edge}
        height={VIEW_H - edge}
        rx={toViewH(CORNER_RADIUS)}
        style={{
          fill: 'var(--panel-face-slate)',
          stroke: 'var(--panel-bezel-dark)',
          strokeWidth: edge,
        }}
      />
      {RING_BEARINGS.map((bearing) => (
        <line key={bearing} data-spoke {...spoke(bearing)} style={line} />
      ))}
      <path data-aircraft d={AIRCRAFT} style={{ ...line, fill: 'var(--panel-face-slate)' }} />
      <line
        x1={toViewX(BAR.x)}
        y1={toViewY(BAR.top)}
        x2={toViewX(BAR.x)}
        y2={toViewY(BAR.bottom)}
        style={line}
      />
      <rect {...rect(MODE_FRAME, MODE_CORNER)} style={line} />
      <rect
        {...rect(MODE_CAP, MODE_CORNER * 0.7)}
        style={{
          fill: 'var(--panel-face)',
          stroke: 'var(--panel-legend-muted)',
          strokeOpacity: 0.5,
          strokeWidth: toViewH(LINE_WIDTH),
        }}
      />
    </>
  );
});

function Led({
  id,
  x,
  y,
  lit,
  colour,
}: {
  id: string;
  x: number;
  y: number;
  lit: boolean;
  colour: string;
}) {
  const [cx, cy] = [toViewX(x), toViewY(y)];
  return (
    <>
      {lit && (
        <circle
          data-glow={id}
          cx={cx}
          cy={cy}
          r={toViewH(GLOW_DIAMETER) / 2}
          style={{ fill: colour, fillOpacity: 0.3 }}
        />
      )}
      <circle
        data-led={id}
        data-lit={lit}
        cx={cx}
        cy={cy}
        r={toViewH(LED_DIAMETER) / 2}
        style={{
          fill: lit ? colour : 'var(--panel-cap-light)',
          stroke: 'var(--panel-legend-muted)',
          strokeWidth: toViewH(LINE_WIDTH) / 2,
        }}
      />
    </>
  );
}

type WordProps = {
  mode: Mode;
  size: string;
  style: CSSProperties;
  children: ReactNode;
};

/** A printed word; the mirror prints the face words in the secondary tier, as small as the unit does. */
function Word({ mode, size, style, children }: WordProps) {
  return (
    <span
      data-lettering={mode === 'mirror' ? 'secondary' : undefined}
      style={{
        position: 'absolute',
        fontSize: size,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function ModeKey({ send }: { send: DeviceScreenProps['send'] }) {
  const hold = useHold(() => send('mode', 'release'));
  return (
    <button
      type="button"
      className="cpt-flarm-key"
      data-control="mode"
      style={{
        position: 'absolute',
        left: percent(MODE_FRAME.left),
        top: percent(MODE_FRAME.top),
        width: percent(MODE_FRAME.right - MODE_FRAME.left),
        height: percent(MODE_FRAME.bottom - MODE_FRAME.top),
        minWidth: 'var(--size-target)',
        minHeight: 'var(--size-target)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        padding: 0,
        margin: 0,
        border: 'none',
        borderRadius: 'var(--radius-md)',
        color: 'var(--panel-legend)',
        fontFamily: 'inherit',
        fontSize: TYPE.dock.key,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
      {...hold.handlers(() => send('mode', 'press'))}
    >
      Mode
    </button>
  );
}

/**
 * The FLARM display's face, drawn the same in the dock and in the slot mirror: the dock prints
 * FLARM itself and operates the Mode key; the mirror leaves FLARM to its frame label.
 */
export function FlarmFace(props: FlarmFaceProps) {
  const { mode, on, state } = props;
  const leds = ledsOf(on ? state : { ...state, powered: false });
  const type = TYPE[mode];
  const red = 'var(--panel-lamp-red)';
  const green = 'var(--panel-led-lit)';
  const leftOf = (y: number): CSSProperties => ({
    left: percent(STATUS_LABEL_X),
    top: percent(y),
    transform: 'translateY(-50%)',
  });
  const rightTo = (y: number): CSSProperties => ({
    right: percent(1 - SIDE_LABEL_END),
    top: percent(y),
    transform: 'translateY(-50%)',
  });

  return (
    <div className="cpt-device-flarm" data-display style={{ ...boxStyle[mode], ...faceStyle }}>
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} style={artStyle} aria-hidden="true">
        <FaceArt />
        {STATUS_LEDS.map(({ id, y }) => (
          <Led key={id} id={id} x={STATUS_LED_X} y={y} lit={leds[id]} colour={green} />
        ))}
        <Led id="above" x={SIDE_LED_X} y={ABOVE.ledY} lit={leds.above} colour={red} />
        <Led id="below" x={SIDE_LED_X} y={BELOW.ledY} lit={leds.below} colour={red} />
        {RING_BEARINGS.map((bearing, index) => {
          const { x, y } = ringLed(bearing);
          return (
            <Led
              key={bearing}
              id={`ring-${index}`}
              x={x}
              y={y}
              lit={leds.ring[index] === true}
              colour={red}
            />
          );
        })}
      </svg>
      {mode === 'dock' && (
        <span
          style={{
            position: 'absolute',
            left: percent(WORDMARK.x),
            top: percent(WORDMARK.y),
            transform: 'translate(-50%, -50%)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-2xl)',
            lineHeight: 1,
            pointerEvents: 'none',
          }}
        >
          FLARM
        </span>
      )}
      {STATUS_LEDS.map(({ id, word, y }) => (
        <Word key={id} mode={mode} size={type.status} style={leftOf(y)}>
          {word}
        </Word>
      ))}
      <Word mode={mode} size={type.side} style={rightTo(ABOVE.labelY)}>
        above
      </Word>
      <Word mode={mode} size={type.side} style={rightTo(BELOW.labelY)}>
        below
      </Word>
      {props.mode === 'dock' ? (
        <ModeKey send={props.send} />
      ) : (
        <Word
          mode={mode}
          size={type.key}
          style={{
            left: percent(MODE_LEGEND.x),
            top: percent(MODE_LEGEND.y),
            transform: 'translate(-50%, -50%)',
          }}
        >
          Mode
        </Word>
      )}
    </div>
  );
}

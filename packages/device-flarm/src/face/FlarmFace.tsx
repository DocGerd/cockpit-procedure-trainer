import type { CSSProperties } from 'react';
import { RING_LEDS, ledsOf } from '../logic';
import type { FlarmState } from '../logic';

const CENTRE = 50;
const RING_RADIUS = 36;
const RING_LED_RADIUS = 6;
const FIRST_LED_DEG = 18;
const LED_STEP_DEG = 36;
const SIDE_LED_X = 90;
const ABOVE_LED_Y = 12;
const BELOW_LED_Y = 88;
const SIDE_LED_RADIUS = 5;

const AIRCRAFT =
  'M50 30 L53 40 L53 48 L72 58 L72 63 L53 58 L53 66 L60 71 L60 74 L50 72 L40 74 L40 71 L47 66 L47 58 L28 63 L28 58 L47 48 L47 40 Z';

const ringPoint = (index: number) => {
  const radians = ((FIRST_LED_DEG + index * LED_STEP_DEG) * Math.PI) / 180;
  return {
    x: CENTRE + RING_RADIUS * Math.sin(radians),
    y: CENTRE - RING_RADIUS * Math.cos(radians),
  };
};

const faceStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr)',
  alignItems: 'center',
  columnGap: 'var(--space-2)',
  boxSizing: 'border-box',
  width: '100%',
  height: '100%',
  padding: 'var(--space-1)',
  background: 'var(--panel-screen)',
  color: 'var(--panel-legend)',
  fontFamily: 'var(--font-mono)',
};

const columnStyle: CSSProperties = { display: 'grid', rowGap: 'var(--space-1)' };

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  columnGap: 'var(--space-2)',
};

const discStyle: CSSProperties = {
  width: 'var(--space-3)',
  height: 'var(--space-3)',
  flex: 'none',
  display: 'block',
};

const ledStyle = (lit: boolean, colour: string): CSSProperties => ({
  fill: lit ? colour : 'var(--panel-lamp-off)',
  stroke: 'var(--panel-metal-light)',
  strokeWidth: 1,
});

const outlineStyle: CSSProperties = {
  fill: 'none',
  stroke: 'var(--panel-legend-muted)',
  strokeWidth: 2,
  strokeLinejoin: 'round',
};

const ringStyle: CSSProperties = { flex: '1 1 0', minWidth: 0, height: '100%', display: 'block' };

const sideStyle: CSSProperties = {
  display: 'grid',
  gridTemplateRows: 'auto 1fr auto',
  alignSelf: 'stretch',
  color: 'var(--panel-legend-muted)',
};

export type FlarmFaceProps = {
  on: boolean;
  state: FlarmState;
  /** The text size of the status words. */
  size: 'var(--text-md)' | 'var(--text-2xl)';
  /** Print the words beside the above and below LEDs. */
  sideWords?: boolean;
};

/** The unit's LED face without its key: status column, ring and above/below LEDs. */
export function FlarmFace({ on, state, size, sideWords = false }: FlarmFaceProps) {
  const leds = ledsOf(on ? state : { ...state, powered: false });
  const textStyle: CSSProperties = {
    fontSize: size,
    lineHeight: size === 'var(--text-2xl)' ? 'var(--leading-2xl)' : 'var(--leading-md)',
  };
  const status = [
    ['rx', 'RX', leds.rx],
    ['tx', 'TX', leds.tx],
    ['gps', 'GPS', leds.gps],
    ['power', 'Power', leds.power],
  ] as const;
  const red = 'var(--panel-lamp-red)';

  return (
    <div style={faceStyle}>
      <div style={columnStyle}>
        {status.map(([id, word, lit]) => (
          <div key={id} style={rowStyle}>
            <svg viewBox="0 0 12 12" style={discStyle} aria-hidden="true">
              <circle
                data-led={id}
                data-lit={lit}
                cx={6}
                cy={6}
                r={5}
                style={ledStyle(lit, 'var(--panel-lamp-green)')}
              />
            </svg>
            <span style={textStyle}>{word}</span>
          </div>
        ))}
      </div>
      <div style={{ ...rowStyle, minHeight: 0, height: '100%' }}>
        <svg viewBox="0 0 100 100" style={ringStyle} aria-hidden="true">
          <path d={AIRCRAFT} style={outlineStyle} />
          {Array.from({ length: RING_LEDS }, (_, index) => {
            const { x, y } = ringPoint(index);
            return (
              <circle
                key={index}
                data-led={`ring-${index}`}
                data-lit={leds.ring[index]}
                cx={x}
                cy={y}
                r={RING_LED_RADIUS}
                style={ledStyle(leds.ring[index] === true, red)}
              />
            );
          })}
          <circle
            data-led="above"
            data-lit={leds.above}
            cx={SIDE_LED_X}
            cy={ABOVE_LED_Y}
            r={SIDE_LED_RADIUS}
            style={ledStyle(leds.above, red)}
          />
          <circle
            data-led="below"
            data-lit={leds.below}
            cx={SIDE_LED_X}
            cy={BELOW_LED_Y}
            r={SIDE_LED_RADIUS}
            style={ledStyle(leds.below, red)}
          />
        </svg>
        {sideWords && (
          <div style={sideStyle}>
            <span style={textStyle}>above</span>
            <span />
            <span style={textStyle}>below</span>
          </div>
        )}
      </div>
    </div>
  );
}

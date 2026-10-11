import { memo } from 'react';
import type { CSSProperties } from 'react';
import {
  BODY,
  BODY_RADIUS,
  CRADLE,
  CRADLE_RADIUS,
  FACE,
  POWER_BUMP,
  RAIL,
  SCREEN,
  SCREEN_FRAME,
  SENSOR,
} from './geometry';
import type { KeySpec, Pictogram, Rect } from './geometry';

const fill = (token: string, opacity?: number): CSSProperties => ({
  fill: `var(--panel-${token})`,
  fillOpacity: opacity,
});
const stroke = (token: string, width: number, opacity?: number): CSSProperties => ({
  fill: 'none',
  stroke: `var(--panel-${token})`,
  strokeWidth: width,
  strokeOpacity: opacity,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

const layerStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  overflow: 'visible',
  pointerEvents: 'none',
};

const rectProps = (rect: Rect) => ({
  x: rect.x,
  y: rect.y,
  width: rect.width,
  height: rect.height,
});

/** A raised part on the frame's top edge: dark, lit along its top. */
function TopPart({ rect }: { rect: Rect }) {
  return (
    <>
      <rect {...rectProps(rect)} rx={rect.height / 3} style={fill('bezel-dark')} />
      <path
        d={`M${rect.x + 2} ${rect.y + 0.75} H${rect.x + rect.width - 2}`}
        style={stroke('cap', 1, 0.5)}
      />
    </>
  );
}

/** The cradle, the unit's body and the screen's black frame; the same in the dock and the slot. */
export const CradleArt = memo(function CradleArt() {
  const frame: Rect = {
    x: SCREEN.x - SCREEN_FRAME,
    y: SCREEN.y - SCREEN_FRAME,
    width: SCREEN.width + 2 * SCREEN_FRAME,
    height: SCREEN.height + 2 * SCREEN_FRAME,
  };
  const lipY = BODY.y + BODY.height - 1.5;
  return (
    <svg
      data-face-art
      aria-hidden="true"
      viewBox={`0 0 ${FACE.width} ${FACE.height}`}
      style={layerStyle}
    >
      <rect
        {...rectProps(CRADLE)}
        x={CRADLE.x + 2}
        y={CRADLE.y + 3}
        rx={CRADLE_RADIUS}
        style={fill('shadow', 0.35)}
      />
      <TopPart rect={RAIL} />
      <TopPart rect={POWER_BUMP} />
      <rect {...rectProps(CRADLE)} rx={CRADLE_RADIUS} style={fill('bezel-dark')} />
      <rect
        {...rectProps(CRADLE)}
        x={CRADLE.x + 0.5}
        y={CRADLE.y + 0.5}
        width={CRADLE.width - 1}
        height={CRADLE.height - 1}
        rx={CRADLE_RADIUS}
        style={stroke('metal-light', 1, 0.35)}
      />
      <rect
        {...rectProps(BODY)}
        rx={BODY_RADIUS}
        style={{ ...fill('body-grey'), stroke: 'var(--panel-shadow)', strokeWidth: 2 }}
      />
      <path
        d={`M${BODY.x + BODY_RADIUS} ${lipY} H${BODY.x + BODY.width - BODY_RADIUS}`}
        style={stroke('cap-light', 1.5, 0.35)}
      />
      <circle cx={SENSOR.x} cy={SENSOR.y} r={SENSOR.r} style={fill('face')} />
      <rect {...rectProps(frame)} style={fill('screen')} />
    </svg>
  );
});

// Generic pictograms in a 24 by 24 box, drawn for this trainer.
const PICTOGRAMS: Readonly<Record<Pictogram, string>> = {
  zoomOut: 'M7 10H13 M10 10m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0 M14.5 14.5L20 20',
  zoomIn: 'M7 10H13 M10 7V13 M10 10m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0 M14.5 14.5L20 20',
  menu: 'M6 3H18V21H6Z M9 8H15 M9 12H15 M9 16H15',
  home: 'M3 12L12 4L21 12 M6 10V20H18V10 M10 20V15H14V20',
  back: 'M9 6L4 11L9 16 M4 11H15A5 5 0 0 1 15 21H11',
};

function PictogramArt({ pictogram, rect }: { pictogram: Pictogram; rect: Rect }) {
  const scale = Math.min(rect.width, rect.height) / 24;
  const x = rect.x + (rect.width - 24 * scale) / 2;
  const y = rect.y + (rect.height - 24 * scale) / 2;
  return (
    <path
      d={PICTOGRAMS[pictogram]}
      transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(3)})`}
      style={stroke('legend', 2.2)}
    />
  );
}

const inScreen = (rect: Rect): Rect => ({ ...rect, x: rect.x - SCREEN.x, y: rect.y - SCREEN.y });

/** The drawn keys of a page: charcoal tiles, lighter at the top, with their pictograms. */
export function KeyArt({ keys }: { keys: readonly KeySpec[] }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${SCREEN.width} ${SCREEN.height}`}
      preserveAspectRatio="none"
      style={layerStyle}
    >
      {keys.map((key) => {
        const tile = inScreen(key.drawn);
        const top: Rect = { ...tile, height: tile.height * 0.45 };
        const icon = inScreen({
          ...key.drawn,
          y: key.drawn.y + key.drawn.height * 0.05,
          height: key.drawn.height * 0.56,
        });
        return (
          <g key={`${key.drawn.x} ${key.drawn.y}`}>
            <rect {...rectProps(tile)} rx={1.5} style={fill('plastic')} />
            <rect {...rectProps(top)} rx={1.5} style={fill('plastic-light', 0.3)} />
            <path
              d={`M${tile.x + 1} ${tile.y + 0.5} H${tile.x + tile.width - 1}`}
              style={stroke('legend', 0.75, 0.45)}
            />
            {key.pictogram && <PictogramArt pictogram={key.pictogram} rect={icon} />}
          </g>
        );
      })}
    </svg>
  );
}

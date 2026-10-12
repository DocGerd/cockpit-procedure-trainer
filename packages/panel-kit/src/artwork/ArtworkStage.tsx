// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./css.d.ts" />
import { handAngle } from '@cpt/core';
import type {
  ArtworkAppearance,
  ArtworkWindow,
  IndicatorValue,
  JsonObject,
  MovingPart,
} from '@cpt/core';
import { useId, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import './artwork.css';
import { layerFraction, needleAngle, pointAlong } from './geometry';
import type { FaceBox, LayerValue } from './geometry';

export type Artwork = ArtworkAppearance['artwork'];
export type Size = { width: number; height: number };

type StageProps = {
  artwork: Artwork;
  value: LayerValue;
  /** Whether the control's guard is open, which swaps in the artwork's open-guard image. */
  guardOpen?: boolean | undefined;
  notches?: readonly string[] | undefined;
  fallback: ReactNode;
  options?: JsonObject | undefined;
  imageLabel?: string | undefined;
  renderInput?: ((size: Size | null) => ReactNode) | undefined;
  /** Where the input lies on the face; elsewhere a tap passes through to whatever is beneath. */
  inputBox?: FaceBox | undefined;
  /** Per artwork window id, the value it prints. */
  windows?: Readonly<Record<string, IndicatorValue>> | undefined;
};

const stageStyle: CSSProperties = { position: 'relative', width: '100%' };
const passThroughStyle: CSSProperties = { ...stageStyle, pointerEvents: 'none' };
const faceStyle: CSSProperties = { display: 'block', width: '100%', height: 'auto' };
const overlayStyle: CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
};
const glassStyle: CSSProperties = { ...overlayStyle, display: 'block' };
const silhouetteStyle: CSSProperties = { maskType: 'alpha' };
const shadowStyle: CSSProperties = { fill: 'var(--panel-shadow)' };

// The light falls from the upper left; as fractions of the face's shorter side.
const NEEDLE_SHADOW = { x: 0.012, y: 0.022, opacity: 0.5 };

type Layer = { source: string | undefined; transform: string | undefined };

// A needle image is drawn at 0 degrees, as authored, and rotated clockwise by the absolute angle.
function movingLayers(
  moving: MovingPart,
  value: LayerValue,
  notches: readonly string[] | undefined,
): Layer[] {
  const fraction = layerFraction(value, notches);
  switch (moving.type) {
    case 'positions':
      return [{ source: moving.images[String(value)], transform: undefined }];
    case 'needle':
      return [
        {
          source: moving.image,
          transform: `rotate(${needleAngle(moving, fraction)} ${moving.pivot.x} ${moving.pivot.y})`,
        },
      ];
    case 'needles':
      return moving.needles.map((hand) => ({
        source: hand.image,
        transform: `rotate(${handAngle(hand, fraction)} ${hand.pivot.x} ${hand.pivot.y})`,
      }));
    case 'travel': {
      const first = moving.path[0];
      const at = pointAlong(moving.path, fraction);
      return [
        {
          source: moving.image,
          transform: first ? `translate(${at.x - first.x} ${at.y - first.y})` : undefined,
        },
      ];
    }
  }
}

function windowText(value: IndicatorValue | undefined, window: ArtworkWindow): string {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toFixed(window.decimals ?? 0) : '';
  }
  return value === undefined ? '' : String(value);
}

function shadowOffset({ width, height }: Size): string {
  const side = Math.min(width, height);
  return `translate(${NEEDLE_SHADOW.x * side} ${NEEDLE_SHADOW.y * side})`;
}

export function ArtworkStage({
  artwork,
  value,
  guardOpen,
  notches,
  fallback,
  options,
  imageLabel,
  renderInput,
  inputBox,
  windows,
}: StageProps) {
  const [size, setSize] = useState<Size | null>(null);
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const maskId = `pk-shadow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const { face, moving, glass } = artwork;
  const open = guardOpen ? artwork.guardOpen?.[String(value)] : undefined;
  const layers = movingLayers(moving, value, notches).map((layer) =>
    open ? { ...layer, source: open } : layer,
  );
  const sources = layers.map((layer) => layer.source);
  if (
    sources.length === 0 ||
    sources.some((source) => source === undefined || failed.has(source)) ||
    failed.has(face) ||
    (glass !== undefined && failed.has(glass))
  ) {
    return <>{fallback}</>;
  }
  const drawn = layers as { source: string; transform: string | undefined }[];

  const fail = (url: string) => setFailed((previous) => new Set(previous).add(url));
  const shadow =
    (moving.type === 'needle' || moving.type === 'needles') && options?.needleShadow === true;
  const printed = Object.entries(artwork.windows ?? {});

  return (
    <div
      style={inputBox ? passThroughStyle : stageStyle}
      {...(imageLabel === undefined ? {} : { role: 'img', 'aria-label': imageLabel })}
    >
      <img
        src={face}
        alt=""
        draggable={false}
        style={faceStyle}
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (naturalWidth > 0 && naturalHeight > 0) {
            setSize({ width: naturalWidth, height: naturalHeight });
          }
        }}
        onError={() => fail(face)}
      />
      {size && (
        <svg
          viewBox={`0 0 ${size.width} ${size.height}`}
          aria-hidden="true"
          focusable="false"
          className="cpt-artwork-moving"
          data-moving={moving.type}
          style={overlayStyle}
        >
          {shadow && (
            <>
              <defs>
                <mask id={maskId} style={silhouetteStyle}>
                  {drawn.map(({ source, transform }, index) => (
                    <image
                      key={index}
                      href={source}
                      width={size.width}
                      height={size.height}
                      preserveAspectRatio="none"
                      transform={transform}
                    />
                  ))}
                </mask>
              </defs>
              <g data-needle-shadow="" transform={shadowOffset(size)}>
                <rect
                  width={size.width}
                  height={size.height}
                  mask={`url(#${maskId})`}
                  opacity={NEEDLE_SHADOW.opacity}
                  style={shadowStyle}
                />
              </g>
            </>
          )}
          {printed.map(([id, window]) => (
            <text
              key={id}
              className="cpt-artwork-window"
              data-window={id}
              x={window.at.x}
              y={window.at.y}
              fontSize={window.fontSize}
              textAnchor={window.anchor ?? 'middle'}
              dominantBaseline="central"
            >
              {windowText(windows?.[id], window)}
            </text>
          ))}
          {drawn.map(({ source, transform }, index) => (
            <image
              key={index}
              href={source}
              width={size.width}
              height={size.height}
              preserveAspectRatio="none"
              transform={transform}
              onError={() => fail(source)}
            />
          ))}
        </svg>
      )}
      {size && glass !== undefined && (
        <img
          src={glass}
          alt=""
          draggable={false}
          className="cpt-artwork-glass"
          style={glassStyle}
          onError={() => fail(glass)}
        />
      )}
      {inputBox ? (
        <div
          className="cpt-artwork-hit"
          style={{
            left: `${inputBox.left * 100}%`,
            top: `${inputBox.top * 100}%`,
            width: `${inputBox.width * 100}%`,
            height: `${inputBox.height * 100}%`,
          }}
        >
          {renderInput?.(size)}
        </div>
      ) : (
        renderInput?.(size)
      )}
    </div>
  );
}

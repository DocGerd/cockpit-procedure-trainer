// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./css.d.ts" />
import type { ArtworkAppearance, JsonObject, MovingPart } from '@cpt/core';
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
  notches?: readonly string[] | undefined;
  fallback: ReactNode;
  options?: JsonObject | undefined;
  imageLabel?: string | undefined;
  renderInput?: ((size: Size | null) => ReactNode) | undefined;
  /** Where the input lies on the face; elsewhere a tap passes through to whatever is beneath. */
  inputBox?: FaceBox | undefined;
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

function movingSource(moving: MovingPart, value: LayerValue): string | undefined {
  return moving.type === 'positions' ? moving.images[String(value)] : moving.image;
}

// The needle image is drawn at 0 degrees, as authored, and rotated clockwise by the absolute angle.
function movingTransform(
  moving: MovingPart,
  value: LayerValue,
  notches: readonly string[] | undefined,
): string | undefined {
  const fraction = layerFraction(value, notches);
  if (moving.type === 'needle') {
    return `rotate(${needleAngle(moving, fraction)} ${moving.pivot.x} ${moving.pivot.y})`;
  }
  if (moving.type === 'travel') {
    const first = moving.path[0];
    const at = pointAlong(moving.path, fraction);
    return first ? `translate(${at.x - first.x} ${at.y - first.y})` : undefined;
  }
  return undefined;
}

function shadowOffset({ width, height }: Size): string {
  const side = Math.min(width, height);
  return `translate(${NEEDLE_SHADOW.x * side} ${NEEDLE_SHADOW.y * side})`;
}

export function ArtworkStage({
  artwork,
  value,
  notches,
  fallback,
  options,
  imageLabel,
  renderInput,
  inputBox,
}: StageProps) {
  const [size, setSize] = useState<Size | null>(null);
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const maskId = `pk-shadow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const { face, moving, glass } = artwork;
  const source = movingSource(moving, value);
  if (
    source === undefined ||
    failed.has(face) ||
    failed.has(source) ||
    (glass !== undefined && failed.has(glass))
  ) {
    return <>{fallback}</>;
  }

  const fail = (url: string) => setFailed((previous) => new Set(previous).add(url));
  const transform = movingTransform(moving, value, notches);
  const shadow = moving.type === 'needle' && options?.needleShadow === true;

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
                  <image
                    href={source}
                    width={size.width}
                    height={size.height}
                    preserveAspectRatio="none"
                    transform={transform}
                  />
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
          <image
            href={source}
            width={size.width}
            height={size.height}
            preserveAspectRatio="none"
            transform={transform}
            onError={() => fail(source)}
          />
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
